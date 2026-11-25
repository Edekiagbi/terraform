variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "us-east-1"
}

variable "docker_image" {
  description = "Public Docker Hub image URI, including its tag."
  type        = string

  validation {
    condition     = can(regex("^([[:alnum:]_.-]+/)?[[:alnum:]_.-]+:[[:alnum:]_.-]+$", var.docker_image))
    error_message = "Use an image name with a tag, such as dockerhub-user/marketsquare:latest."
  }
}

variable "desired_count" {
  description = "Number of MarketSquare frontend tasks."
  type        = number
  default     = 1

  validation {
    condition     = var.desired_count >= 1 && var.desired_count <= 10
    error_message = "desired_count must be between 1 and 10."
  }
}

variable "container_cpu" {
  description = "Fargate task CPU units. Valid values include 256, 512, 1024, 2048, and 4096."
  type        = number
  default     = 256
}

variable "container_memory" {
  description = "Fargate task memory in MiB."
  type        = number
  default     = 512
}
