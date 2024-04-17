mod markdown;
mod render;

use crate::render::render_and_write_html;
use axum::Router;
use clap::Parser;
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

async fn start_development_server() {
    let serve_dir = ServeDir::new("assets/");

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
        let theme = std::env::var("THEME").expect("no env var set");
        render_and_write_html(theme.as_str()).await;
    }
}
