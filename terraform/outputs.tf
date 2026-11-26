output "marketplace_url" {
  description = "Public HTTP URL for the MarketSquare frontend."
  value       = "http://${aws_lb.myalb.dns_name}"
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.mktcluster.name
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group for frontend container logs."
  value       = aws_cloudwatch_log_group.mktloggroup.name
}
