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
  public constructor() {}
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
    return new HueApiResponse([], []);
  }
}
