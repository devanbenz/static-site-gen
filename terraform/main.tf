terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.46.0"
    }
  }

  cloud {
    organization = "weblwabl"

    workspaces {
      name = "whatever-forever"
    }
  }
}

#resource "aws_s3_bucket" "static_assets" {
#  bucket = ""
#
#  tags = {
#    Name        = "My bucket"
#    Environment = "Dev"
#  }
#}
