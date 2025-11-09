# Install AWS CLI

The AWS CLI (Command Line Interface) is required to use AWS features in this extension.

## Installation Instructions

### Windows
Download and run the AWS CLI MSI installer:
- [AWS CLI v2 for Windows](https://awscli.amazonaws.com/AWSCLIV2.msi)

### macOS
Use the installer package:
```bash
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

### Linux
Download and install:
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

## Verify Installation

After installation, verify by running:
```bash
aws --version
```

You should see output like: `aws-cli/2.x.x ...`

## More Information

Visit the [official AWS CLI documentation](https://aws.amazon.com/cli/) for detailed installation instructions and troubleshooting.
