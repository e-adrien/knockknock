# KnockKnock

This is the repository of the knockknock website.

### Requirements

Node.JS 20

The project use the `arp -a` command.
On ubuntu you can install it with `sudo apt-get install net-tools`

### Installation

```bash
git clone git@github.com:e-adrien/knockknock.git
cd knockknock
npm install
```

### Configuration

Copy the file in `config/config.sample.json` to `config/config.json` and define your own values.

### Fix linting errors

To fix ESLint & Stylelint errors run the following commands :

```bash
npm run eslint-fix
npm run stylelint-fix
```

To ensure consistent code style run the following command :

```bash
npm run prettier-fix
```

To check if the project will pass the Github QC Action you can run the command :

```bash
npm run qc
```

### Build & run the project

Build the project with the command :

```bash
npm run build
```

and then run the server using :

```bash
npm run start
```

### VS Code

Recommended extensions :

- [EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Stylelint](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint)
- [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
