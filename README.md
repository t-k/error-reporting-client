# Error Reporting Client for Client-side JavaScript

JavaScript client for [Google Cloud Error Reporting](https://cloud.google.com/error-reporting/docs/grouping-errors).

It can be used in web browsers.

Inspired by [stackdriver-errors-js](https://www.npmjs.com/package/stackdriver-errors-js), added the ability to insert the source location to the request body automatically, and changed the behavior if the source maps are available.

## Prerequisites

See the [Prerequisites](https://github.com/GoogleCloudPlatform/stackdriver-errors-js/tree/master?tab=readme-ov-file#prerequisites) in the [stackdriver-errors-js](https://www.npmjs.com/package/stackdriver-errors-js) package.

## Installation

```sh
npm i error-reporting-client
# if you use pnpm
pnpm i error-reporting-client
```

## Usage

```ts
import ErrorReporting from "error-reporting-client";

// Initialize the error reporting client with your API key and project ID
const reportClient = new ErrorReporting({
    apiKey: "YOUR_API_KEY",
    projectId: "YOUR_PROJECT_ID",
    // below are optional
    // 
    // service: "my-service",
    // version: "1.0.0",
    // reportUncaughtExceptions: true,
    // reportUnhandledPromiseRejections: true,
    // sourceReferences: [
    //     {
    //         repository: "",
    //         revisionId: "",
    //     },
    // ],
});

// Register the global error and unhandled promise rejection handlers
reportClient.registerHandler();

// Set the user identifier
reportClient.setUser("john-smith");

// Send an error report manually
try {
    // code that might throw an error
} catch(e) {
    reportClient.sendError(e);
}

// You can also provide a source location
reportClient.sendError(new Error("An error occurred"), {
    filePath: "src/App.tsx",
    lineNumber: 53,
    functionName: "App",
});
```

as a utility

```ts
// errorHandler.ts
import ErrorReporting from "error-reporting-client";

let errorHandler: ErrorReporting | undefined
if (typeof window !== "undefined" && typeof errorHandler === "undefined") {
    errorHandler = new ErrorReporting({
        apiKey: "YOUR_API_KEY",
        projectId: "YOUR_PROJECT_ID",
    })
    errorHandler.registerHandler()
}
export default errorHandler
```
```ts
import errorHandler from "./errorHandler"

errorHandler?.sendError(err);
```


## API

### `ErrorReporting`

#### `constructor(options: { projectId: string; apiKey: string; service?: string; version?: string; reportUncaughtExceptions?: boolean; reportUnhandledPromiseRejections?: boolean; sourceReferences?: SourceReference[]; })`

Creates a new instance of the ErrorReporting client.

- `projectId`: Your Google Cloud project ID.
- `apiKey`: Your Google Cloud API key.
- `service`: (Optional) The service name. Defaults to "web".
- `version`: (Optional) The version of the service.
- `reportUncaughtExceptions`: (Optional) Whether to report uncaught exceptions. Defaults to `true`.
- `reportUnhandledPromiseRejections`: (Optional) Whether to report unhandled promise rejections. Defaults to `true`.
- `sourceReferences`: (Optional) A list of source references.

#### `setUser(user: string | undefined): void`

Sets the user identifier for error reports.

- `user`: The user identifier.

#### `disable(): void`

Disables error reporting.

#### `enable(): void`

Enables error reporting.

#### `registerHandler(): void`

Registers global error and unhandled promise rejection handlers.

#### `sendError(err: Error | string, reportLocation?: SourceLocation): Promise<void>`

Sends an error report.

- `err`: The error to report.
- `reportLocation`: (Optional) The location in the source code where the error was reported. If not provided, the location is determined automatically.

### `SourceLocation`

Indicates a location in the source code of the service for which errors are reported.

- `filePath`: The source code filename, which can include a truncated relative path, or a full path from a production machine.
- `lineNumber`: (Optional) 1-based. 0 indicates that the line number is unknown.
- `functionName`: Human-readable name of a function or method. The value can include optional context like the class or package name.

### `SourceReference`

A reference to a particular snapshot of the source tree used to build and deploy an application.

- `repository`: (Optional) A URI string identifying the repository.
- `revisionId`: The canonical and persistent identifier of the deployed revision.
