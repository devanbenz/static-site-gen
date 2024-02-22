use axum::Router;
use clap::builder::Str;
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

fn temp_gen_md() -> Vec<String> {
    let mut contents: Vec<String> = Vec::new();
    for md_file in glob("themes/boring/content/blog/*.md").expect("error") {
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

async fn render_and_write_html(theme: &str) {
    let mut context = Context::new();
    let md_contents = generate_markdown_from_files();

    for content in md_contents {
        context.insert("content", &markdown::to_html(content.as_str()));
    }

    context.insert("title", "Devan Benz");
    context.insert("homepage_title", "whateverforever.computer");
    context.insert("homepage_subtitle", "Hey there I'm Devan Benz");

    let tera = match Tera::new(format!("themes/{}/templates/**/*.html", theme).as_str()) {
        Ok(t) => t,
        Err(e) => {
            eprintln!("Parser error(s): {}", e);
            process::exit(1);
        }
    };

    let rendered_html = tera
        .render("index.html", &context)
        .expect("cannot create templated html");

    let mut file = File::create(format!("themes/{}/static/index.html", theme))
        .expect("cannot create index.html file");
    file.write_all(rendered_html.as_bytes())
        .expect("could not write data to html file");
}

async fn start_development_server() {
    let serve_dir = ServeDir::new("themes/boring/static");

    let app = Router::new().nest_service("/", serve_dir);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("cannot bind port 3000");

    axum::serve(listener, app)
        .await
        .expect("cannot start axum development server");
}

#[tokio::main]
async fn main() {
    let cli = Args::parse();

    if cli.development {
        let theme = std::env::var("THEME").expect("no env var set");
        render_and_write_html(theme.as_str()).await;
        start_development_server().await;
    }

    if cli.generate {
        // let theme = std::env::var("THEME").expect("no env var set");
        // render_and_write_html(theme.as_str()).await;
        for i in temp_gen_md() {
            println!("{}", markdown::to_html(i.as_str()));
            println!("__________________");
        }
    }
}
