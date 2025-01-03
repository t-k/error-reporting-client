// HTTP request data that is related to a reported error. This data should be provided by the application when reporting an error, unless the error report has been generated automatically from Google App Engine logs.
// https://cloud.google.com/error-reporting/reference/rest/v1beta1/ErrorContext#HttpRequestContext
export interface HttpRequestContext {
  // The type of HTTP request, such as GET, POST, etc.
  method?: string;
  // The URL of the request.
  url: string;
  // The user agent information that is provided with the request.
  userAgent: string;
  // The referrer information that is provided with the request.
  referrer?: string;
  // The HTTP response status code for the request.
  responseStatusCode?: number;
  // The IP address from which the request originated. This can be IPv4, IPv6, or a token which is derived from the IP address, depending on the data that has been provided in the error report.
  remoteIp?: string;
}

// Indicates a location in the source code of the service for which errors are reported. functionName must be provided by the application when reporting an error, unless the error report contains a message with a supported exception stack trace. All fields are optional for the later case.
// https://cloud.google.com/error-reporting/reference/rest/v1beta1/ErrorContext#SourceLocation
export interface SourceLocation {
  // The source code filename, which can include a truncated relative path, or a full path from a production machine.
  filePath: string;
  // 1-based. 0 indicates that the line number is unknown.
  lineNumber?: number;
  // Human-readable name of a function or method. The value can include optional context like the class or package name. For example, my.package.MyClass.method in case of Java.
  functionName: string;
}

// A reference to a particular snapshot of the source tree used to build and deploy an application.
// https://cloud.google.com/error-reporting/reference/rest/v1beta1/ErrorContext#SourceReference
export interface SourceReference {
  // Optional. A URI string identifying the repository. Example: "https://github.com/GoogleCloudPlatform/kubernetes.git"
  repository?: string;
  // The canonical and persistent identifier of the deployed revision. Example (git): "0035781c50ec7aa23385dc841529ce8a4b70db1b"
  revisionId: string;
}

// A description of the context in which an error occurred. This data should be provided by the application when reporting an error, unless the error report has been generated automatically from Google App Engine logs.
// https://cloud.google.com/error-reporting/reference/rest/v1beta1/ErrorContext
export interface ErrorContext {
  // The HTTP request which was processed when the error was triggered.
  httpRequest: HttpRequestContext;
  // The user who caused or was affected by the crash. This can be a user ID, an email address, or an arbitrary token that uniquely identifies the user. When sending an error report, leave this field empty if the user was not logged in. In this case the Error Reporting system will use other data, such as remote IP address, to distinguish affected users. See affectedUsersCount in ErrorGroupStats.
  user?: string;
  // The location in the source code where the decision was made to report the error, usually the place where it was logged. For a logged exception this would be the source line where the exception is logged, usually close to the place where it was caught.
  reportLocation?: SourceLocation;
  // Source code that was used to build the executable which has caused the given error message.
  sourceReferences: SourceReference[];
}

// Describes a running service that sends errors. Its version changes over time and multiple versions can run in parallel.
// https://cloud.google.com/error-reporting/reference/rest/v1beta1/ServiceContext
export interface ServiceContext {
  // An identifier of the service, such as the name of the executable, job, or Google App Engine service name. This field is expected to have a low number of values that are relatively stable over time, as opposed to version, which can be changed whenever new code is deployed.
  // Contains the service name for error reports extracted from Google App Engine logs or default if the App Engine default service is used.
  service: string;
  // Represents the source code version that the developer provided, which could represent a version label or a Git SHA-1 hash, for example. For App Engine standard environment, the version is set to the version of the app.
  version?: string;
  // Type of the MonitoredResource. List of possible values: https://cloud.google.com/monitoring/api/resources
  // Value is set automatically for incoming errors and must not be set when reporting errors.
  resourceType?: string;
}

// An error event which is reported to the Error Reporting system.
// https://cloud.google.com/error-reporting/reference/rest/v1beta1/projects.events/report#reportederrorevent
export interface RequestBody {
  // Optional. Time when the event occurred. If not provided, the time when the event was received by the Error Reporting system is used. If provided, the time must not exceed the logs retention period in the past, or be more than 24 hours in the future. If an invalid time is provided, then an error is returned.
  // A timestamp in RFC3339 UTC "Zulu" format, with nanosecond resolution and up to nine fractional digits. Examples: "2014-10-02T15:01:23Z" and "2014-10-02T15:01:23.045123456Z".
  eventTime?: string;
  // Required. The service context in which this error has occurred.
  serviceContext: ServiceContext;
  // Required. The error message. If no context.reportLocation is provided, the message must contain a header (typically consisting of the exception type name and an error message) and an exception stack trace in one of the supported programming languages and formats. Supported languages are Java, Python, JavaScript, Ruby, C#, PHP, and Go. Supported stack trace formats are:
  // JavaScript: Must be the value of error.stack as returned by V8.
  message: string;
  // Optional. A description of the context in which the error occurred.
  context?: ErrorContext;
}

export interface Stack {
  functionName: string;
  uri: string;
  line: number;
  column: number;
}
