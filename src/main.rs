use axum::routing::get;
use axum::Router;
use clap::Parser;
use glob::glob;
use std::fs::File;
use std::io::{Read, Write};
use std::process;
use tera::{Context, Tera};
use tower_http::services::fs::ServeDir;

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    // run development server
    #[arg(short, long)]
    development: bool,

    // generate html files from markdown/**/*.md
    #[arg(short, long)]
    generate: bool,
}

fn generate_markdown_from_files() -> Vec<String> {
    let mut contents: Vec<String> = Vec::new();
    for md_file in glob("markdown/**/*.md").expect("could not read markdown files") {
        match md_file {
            Ok(path) => {
                let file = File::open(path);
                let mut file_contents = String::new();
                file.expect("could not open file for reading")
                    .read_to_string(&mut file_contents)
                    .expect("could not read contents");
                contents.push(file_contents);
            }
            Err(e) => {
                eprintln!("error reading files: {}", e);
                process::exit(1);
            }
        }
    }

    contents
}

fn render_and_write_html() {
    let mut context = Context::new();
    let md_contents = generate_markdown_from_files();

    for content in md_contents {
        context.insert("content", &markdown::to_html(content.as_str()));
    }

    let tera = match Tera::new("templates/**/**.html") {
        Ok(t) => t,
        Err(e) => {
            eprintln!("Parser error(s): {}", e);
            std::process::exit(1);
        }
    };

    let rendered_html = tera
        .render("index.html", &context)
        .expect("cannot create templated html");

    let mut file = File::create("public/index.html").expect("cannot create index.html file");
    file.write_all(rendered_html.as_bytes())
        .expect("could not write data to html file");
}

async fn start_development_server() {
    let serve_dir = ServeDir::new("public");

    let app = Router::new()
        .route("/", get(root))
        .nest_service("/public", serve_dir);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("cannot bind port 3000");

    axum::serve(listener, app)
        .await
        .expect("cannot start axum development server");
}

async fn root() -> &'static str {
    "Running development server"
}

#[tokio::main]
async fn main() {
    let cli = Args::parse();

    if cli.development {
        start_development_server().await;
    }

    if cli.generate {
        render_and_write_html();
    }
}
