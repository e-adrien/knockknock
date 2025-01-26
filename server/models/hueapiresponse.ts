// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseHueApiResponseJson(json: any): HueApiResponse | HueApiError | HueApiSuccess {
  // Check if we have an array
  if (Array.isArray(json)) {
    // Check if there is more than one element
    if (json.length > 1) {
      throw new Error("Too many elements in the API response !");
    }

    // Flatten the Array
    json = json[0];
    return json.error !== undefined ? HueApiError.fromJSON(json.error) : HueApiSuccess.fromJSON(json.success);
  }

  // Parse the API Response
  return HueApiResponse.fromJSON(json);
}

export class HueApiError extends Error {
  public readonly type: number;
  public readonly address: string;
  public readonly description: string;

  public constructor(type: number, address: string, description: string) {
    super(description);
    this.type = type;
    this.address = address;
    this.description = description;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): HueApiError {
    return new HueApiError(json.type, json.address, json.description);
  }
}

export class HueApiSuccess {
  public readonly username: string;
  public readonly clientkey: string;

  public constructor(username: string, clientkey: string) {
    this.username = username;
    this.clientkey = clientkey;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): HueApiSuccess {
    return new HueApiSuccess(json.username, json.clientkey);
  }
}

export class HueApiData {
  public readonly type: string;
  public constructor(type: string) {
    this.type = type;
  }
}

export class HueApiResponse {
  public readonly errors: Array<HueApiError>;
  public readonly data: Array<HueApiData>;

  constructor(errors: Array<HueApiError>, data: Array<HueApiData>) {
    this.errors = errors;
    this.data = data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): HueApiResponse {
    return new HueApiResponse(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json.errors.map((error: any) => HueApiError.fromJSON(error)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json.data.map((value: any) => {
        switch (value.type) {
          case "device":
            return HueDevice.fromJSON(value);
          case "grouped_light":
            return HueGroupedLight.fromJSON(value);
          case "light":
            return HueLight.fromJSON(value);
          case "room":
            return HueRoom.fromJSON(value);
          default:
            throw new Error(`Unknown type: ${value.type}`);
        }
      })
    );
  }
}

export type HueDeviceProductData = {
  modelId: string;
  manufacturerName: string;
  productName: string;
  productArchetype: string;
  certified: boolean;
  softwareVersion: string;
  hardwarePlatformType: string;
};

export type HueDeviceMetadata = {
  name: string;
  archetype: string;
};

export type HueDeviceService = {
  rid: string;
  rtype: string;
};

export class HueDevice extends HueApiData {
  public readonly id: string;
  public readonly idv1: string;
  public readonly productData: HueDeviceProductData;
  public readonly metadata: HueDeviceMetadata;
  public readonly services: Array<HueDeviceService>;

  constructor(
    id: string,
    idv1: string,
    productData: HueDeviceProductData,
    metadata: HueDeviceMetadata,
    services: Array<HueDeviceService>,
    type: string
  ) {
    super(type);
    this.id = id;
    this.idv1 = idv1;
    this.productData = productData;
    this.metadata = metadata;
    this.services = services;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): HueDevice {
    return new HueDevice(
      json.id,
      json.id_v1,
      {
        modelId: json.product_data.model_id,
        manufacturerName: json.product_data.manufacturer_name,
        productName: json.product_data.product_name,
        productArchetype: json.product_data.product_archetype,
        certified: json.product_data.certified,
        softwareVersion: json.product_data.software_version,
        hardwarePlatformType: json.product_data.hardware_platform_type,
      },
      {
        name: json.metadata.name,
        archetype: json.metadata.archetype,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json.services.map((service: any) => {
        return { ...service };
      }),
      json.type
    );
  }
}

export type HueDeviceOwner = {
  rid: string;
  rtype: string;
};

export type HueLightOn = {
  on: boolean;
};

export class HueGroupedLight extends HueApiData {
  public readonly id: string;
  public readonly idv1: string;
  public readonly owner: HueDeviceOwner;
  public readonly on: HueLightOn;

  constructor(id: string, idv1: string, owner: HueDeviceOwner, on: HueLightOn, type: string) {
    super(type);
    this.id = id;
    this.idv1 = idv1;
    this.owner = owner;
    this.on = on;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): HueGroupedLight {
    return new HueGroupedLight(
      json.id,
      json.id_v1,
      {
        rid: json.owner.rid,
        rtype: json.owner.rtype,
      },
      {
        on: json.on.on,
      },
      json.type
    );
  }

  public isOn(): boolean {
    return this.on.on;
  }
}

export class HueLight extends HueApiData {
  public readonly id: string;
  public readonly idv1: string;
  public readonly owner: HueDeviceOwner;
  public readonly metadata: HueDeviceMetadata;
  public readonly on: HueLightOn;

  constructor(
    id: string,
    idv1: string,
    owner: HueDeviceOwner,
    metadata: HueDeviceMetadata,
    on: HueLightOn,
    type: string
  ) {
    super(type);
    this.id = id;
    this.idv1 = idv1;
    this.owner = owner;
    this.metadata = metadata;
    this.on = on;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): HueLight {
    return new HueLight(
      json.id,
      json.id_v1,
      {
        rid: json.owner.rid,
        rtype: json.owner.rtype,
      },
      {
        name: json.metadata.name,
        archetype: json.metadata.archetype,
      },
      {
        on: json.on.on,
      },
      json.type
    );
  }

  public isOn(): boolean {
    return this.on.on;
  }
}

export type HueRoomChild = {
  rid: string;
  rtype: string;
};

export class HueRoom extends HueApiData {
  public readonly id: string;
  public readonly idv1: string;
  public readonly children: Array<HueRoomChild>;
  public readonly metadata: HueDeviceMetadata;
  public readonly services: Array<HueDeviceService>;

  constructor(
    id: string,
    idv1: string,
    children: Array<HueRoomChild>,
    metadata: HueDeviceMetadata,
    services: Array<HueDeviceService>,
    type: string
  ) {
    super(type);
    this.id = id;
    this.idv1 = idv1;
    this.children = children;
    this.metadata = metadata;
    this.services = services;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): HueRoom {
    return new HueRoom(
      json.id,
      json.id_v1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json.children.map((child: any) => {
        return { rid: child.rid, rtype: child.rtype };
      }),
      {
        name: json.metadata.name,
        archetype: json.metadata.archetype,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json.services.map((service: any) => {
        return { ...service };
      }),
      json.type
    );
  }
}

export type HueButtonEventData = {
  button: {
    button_report: {
      event: string;
      updated: string;
    };
    last_event: string;
  };
  id: string;
  id_v1: string;
  owner: {
    rid: string;
    rtype: string;
  };
  type: string;
};

export class HueEvent {
  public readonly creationtime: string;
  public readonly data: Array<unknown>;
  public readonly id: string;
  public readonly type: string;

  constructor(creationtime: string, data: Array<unknown>, id: string, type: string) {
    this.creationtime = creationtime;
    this.data = data;
    this.id = id;
    this.type = type;
  }

  public static fromString(raw: string): Array<HueEvent> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (JSON.parse(raw) as Array<any>).map((event) => {
      return new HueEvent(event.creationtime, event.data, event.id, event.type);
    });
  }

  public isButtonEvent(): boolean {
    return this.data.length === 1 && (this.data[0] as HueButtonEventData).type === "button";
  }

  public get buttonEvent(): HueButtonEventData {
    if (!this.isButtonEvent()) {
      throw new Error("This is not a ButtonEvent!");
    }

    return this.data[0] as HueButtonEventData;
  }
}
