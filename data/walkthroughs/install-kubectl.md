# Install kubectl

kubectl is the Kubernetes command-line tool required to fetch environment configurations from Kubernetes clusters.

## Installation Instructions

### Windows
Using Chocolatey:
```bash
choco install kubernetes-cli
```

Or download the binary directly:
- [kubectl for Windows](https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/)

### macOS
Using Homebrew:
```bash
brew install kubectl
```

### Linux
```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

## Verify Installation

After installation, verify by running:
```bash
kubectl version --client
```

## More Information

Visit the [official kubectl documentation](https://kubernetes.io/docs/tasks/tools/) for detailed installation instructions.
