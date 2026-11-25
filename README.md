# MarketSquare

MarketSquare is a frontend-only sample marketplace built with React, Vite, and Tailwind CSS. Its sample catalog supports category filtering, search, sorting, product details, favorites, and a shopping cart saved in browser local storage.

The demo does not provide customer accounts, payment processing, order submission, or seller tools. Checkout is intentionally non-functional and never collects payment information.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. Create a production build with `npm run build`.

## Build and run the container

```powershell
docker build -t marketsquare:latest .
docker run --rm -p 8080:80 marketsquare:latest
```

Visit `http://localhost:8080`. NGINX serves the production build and falls back to `index.html` for client-side routes.

To publish to Docker Hub, tag the image with your account and push it:

```powershell
docker tag marketsquare:latest YOUR_DOCKERHUB_USERNAME/marketsquare:latest
docker login
docker push YOUR_DOCKERHUB_USERNAME/marketsquare:latest
```

## Deploy to AWS

The `terraform` directory provisions a VPC with two public subnets, an internet gateway, an Application Load Balancer, an ECS Fargate cluster and service, task execution IAM role, security groups, and a CloudWatch log group. To keep this demo inexpensive, tasks run in public subnets with public IPs, there is no NAT Gateway, and the load balancer serves HTTP only. Add HTTPS, a custom domain, private subnets, and a NAT or VPC endpoints before using this setup for a production storefront.

Requirements: Terraform 1.5+, AWS credentials configured for the CLI, and a **public** Docker Hub image.

```powershell
Set-Location .\terraform
terraform init
terraform plan -var="docker_image=YOUR_DOCKERHUB_USERNAME/marketsquare:latest"
terraform apply -var="docker_image=YOUR_DOCKERHUB_USERNAME/marketsquare:latest"
```

Terraform prints the load balancer URL when deployment completes. Remove the demo resources when finished:

```powershell
terraform destroy -var="docker_image=YOUR_DOCKERHUB_USERNAME/marketsquare:latest"
```

The image is expected to be publicly pullable by ECS. Do not put Docker Hub passwords or other credentials in Terraform variables or source files.
