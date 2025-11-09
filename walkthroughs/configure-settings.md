# Configure Extension Settings

Configure the extension settings to customize its behavior.

## Required Settings

### AWS CA Bundle Path

If your organization uses a custom SSL certificate for AWS SSO login, you need to configure the certificate path:

1. Open VS Code Settings (File > Preferences > Settings)
2. Search for "AWS Kube Utils"
3. Set **AWS Ca Bundle Path** to the full path of your SSL certificate file

Example: `/path/to/your/certificate.pem`

This path will be used with the `--ca-bundle` parameter when running `aws sso login`.

## Optional Settings

### Status Bar Refresh Interval

Configure how often the AWS profile status bar refreshes (in milliseconds):

- Default: 60000 (1 minute)
- Minimum: 10000 (10 seconds)

## Access Settings

You can quickly access these settings by:
- Opening the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
- Typing "Preferences: Open Settings"
- Searching for "awsKubeUtils"
