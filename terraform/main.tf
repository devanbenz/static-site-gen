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

provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "whatever_forever" {
  bucket = "whateverforever.computer"

  tags = {
  }
}

resource "aws_s3_bucket_ownership_controls" "ownership_control" {
  bucket = aws_s3_bucket.whatever_forever.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "access" {
  bucket = aws_s3_bucket.whatever_forever.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_acl" "acl" {
  depends_on = [
    aws_s3_bucket_ownership_controls.ownership_control,
    aws_s3_bucket_public_access_block.access,
  ]

  bucket = aws_s3_bucket.whatever_forever.id
  acl    = "public-read"
}

resource "aws_s3_bucket_policy" "public_access" {
  bucket = aws_s3_bucket.whatever_forever.id
  policy = data.aws_iam_policy_document.public_access.json
}

data "aws_iam_policy_document" "public_access" {
  statement {
    sid       = "PublicReadGetObject"
    effect    = "Allow"
    resources = ["arn:aws:s3:::whateverforever.computer/*"]
    actions   = ["s3:GetObject"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }
}

resource "aws_s3_bucket_website_configuration" "whatever_forever_site" {
  bucket = aws_s3_bucket.whatever_forever.id

  index_document {
    suffix = "index.html"
  }
}
