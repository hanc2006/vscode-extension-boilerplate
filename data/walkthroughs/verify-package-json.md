# Verify package.json

The extension requires a valid `package.json` file at the workspace root with a `name` property.

## Requirements

Your workspace root must contain a `package.json` file with the following structure:

```json
{
  "name": "your-service-name",
  ...
}
```

The `name` property is used to identify the service when fetching environment configurations from Kubernetes.

## Troubleshooting

### Missing package.json

If you don't have a `package.json` file:
1. Create one at the root of your workspace
2. Add at minimum: `{ "name": "your-service-name" }`

### Missing name property

If your `package.json` exists but doesn't have a `name` property:
1. Open the `package.json` file
2. Add the `name` property with your service name

## Example

```json
{
  "name": "yol-identity-service",
  "version": "1.0.0",
  "description": "Identity service for YOL platform"
}
```

The extension will use the `name` value to fetch the correct Kubernetes secrets for your service.
