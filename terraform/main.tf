
resource "aws_vpc" "mymainvpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
}

resource "aws_internet_gateway" "myigw" {
  vpc_id = aws_vpc.mymainvpc.id
}

resource "aws_subnet" "publicsubnet1" {

  vpc_id                  = aws_vpc.mymainvpc.id
  availability_zone       = data.aws_availability_zones.available.names[0]
  cidr_block              = "10.0.0.0/24"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "publicsubnet2" {
  vpc_id                  = aws_vpc.mymainvpc.id
  availability_zone       = data.aws_availability_zones.available.names[1]
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
}

resource "aws_route_table" "publicRT" {
  vpc_id = aws_vpc.mymainvpc.id
}

resource "aws_route" "publicRoute" {
  route_table_id         = aws_route_table.publicRT.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.myigw.id
}

resource "aws_route_table_association" "subnetassoc" {
  count          = 2
  subnet_id      = [aws_subnet.publicsubnet1.id, aws_subnet.publicsubnet2.id][count.index]
  route_table_id = aws_route_table.publicRT.id
}

resource "aws_security_group" "alsg" {
  name        = "albsg"
  description = "Allow public HTTP traffic to the MarketSquare load balancer."
  vpc_id      = aws_vpc.mymainvpc.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "task-def" {
  name        = "task-def-sg"
  description = "Allow HTTP only from the MarketSquare load balancer."
  vpc_id      = aws_vpc.mymainvpc.id

  ingress {
    description     = "Application traffic from the ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alsg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb" "myalb" {
  name_prefix        = "msq-"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alsg.id]
  subnets            = [aws_subnet.publicsubnet1.id, aws_subnet.publicsubnet2.id]
}

resource "aws_lb_target_group" "mytg" {
  name_prefix = "msq-"
  port        = 80
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.mymainvpc.id

  health_check {
    enabled             = true
    path                = "/"
    matcher             = "200-399"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.myalb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.mytg.arn
  }
}

resource "aws_ecs_cluster" "mktcluster" {
  name = "marketsquare-cluster"
}

resource "aws_cloudwatch_log_group" "mktloggroup" {
  name              = "/ecs/marketsquare"
  retention_in_days = 14
}

resource "aws_iam_role" "task_execution" {
  name = "ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_ecs_task_definition" "mytaskdef" {
  family                   = "mytaskdef"
  cpu                      = var.container_cpu
  memory                   = var.container_memory
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.task_execution.arn

  container_definitions = jsonencode([{
    name      = "marketsquare_app"
    image     = var.docker_image
    essential = true
    portMappings = [{
      containerPort = 80
      hostPort      = 80
      protocol      = "tcp"
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.mktloggroup.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "marketsquare"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "wget -q -O /dev/null http://127.0.0.1/ || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 10
    }
  }])
}

resource "aws_ecs_service" "myservice" {
  name                               = "service"
  cluster                            = aws_ecs_cluster.mktcluster.id
  task_definition                    = aws_ecs_task_definition.mytaskdef.arn
  desired_count                      = var.desired_count
  launch_type                        = "FARGATE"
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = [aws_subnet.publicsubnet1.id, aws_subnet.publicsubnet2.id]
    security_groups  = [aws_security_group.task-def.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.mytg.arn
    container_name   = "marketsquare_app"
    container_port   = 80
  }

  depends_on = [
    aws_iam_role_policy_attachment.task_execution,
    aws_lb_listener.http,
  ]
}
