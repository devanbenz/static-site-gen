use std::fs::File;
use std::io::Write;
use std::process;

use frontmatter::parse_and_find_content;
use serde::{Deserialize, Serialize};
use tera::{Context, Tera};
use yaml_rust::Yaml;

use crate::markdown::{generate_markdown_from_files, get_info_value};

#[derive(Serialize, Debug)]
struct Section {
    pages: Vec<Page>,
    title: String,
}

#[derive(Serialize, Debug)]
struct Page {
    title: String,
    permalink: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct BlogInformation {
    title: String,
    title_slug: String,
    date: Option<String>,
    description: Option<String>,
}

fn render_blog_info(info_block: Option<Yaml>) -> BlogInformation {
    if let Some(value) = info_block.unwrap().as_hash() {
        let title = value
            .get(&Yaml::String("title".to_string()))
            .unwrap()
            .as_str()
            .unwrap();
        let title_slug = value
            .get(&Yaml::String("title_slug".to_string()))
            .unwrap()
            .as_str()
            .unwrap();
        let date = get_info_value("date".to_string(), value);
        let description = get_info_value("description".to_string(), value);

        return BlogInformation {
            title: title.to_string(),
            title_slug: title_slug.to_string(),
            date,
            description,
        };
    }

    BlogInformation {
        title: "".to_string(),
        title_slug: "".to_string(),
        date: None,
        description: None,
    }
}

pub async fn render_and_write_html(theme: &str) {
    let template = match Tera::new(format!("themes/{}/templates/**/*.html", theme).as_str()) {
        Ok(t) => t,
        Err(e) => {
            eprintln!("Parser error(s): {}", e);
            process::exit(1)
        }
    };

    let mut context = Context::new();
    let md_contents = generate_markdown_from_files();

    context.insert("title", "Devan Benz");
    context.insert("homepage_title", "whateverforever.computer");
    context.insert("homepage_subtitle", "Hey there I'm Devan Benz");

    let mut section: Section = Section {
        title: "posts".to_string(),
        pages: vec![],
    };

    for content in md_contents {
        let mut blog_post_context = Context::new();
        let (front_matter_str, content) = parse_and_find_content(&content).expect("cannot parse");
        let blog_info = render_blog_info(front_matter_str);

        blog_post_context.insert("title", blog_info.title.as_str());
        blog_post_context.insert(
            "date",
            &blog_info.date.expect("could not generate date").as_str(),
        );
        blog_post_context.insert(
            "content",
            markdown::to_html_with_options(content, &markdown::Options::gfm())
                .expect("could not parse MD")
                .as_str(),
        );

        let rendered_blog_post_html = template
            .render("page.html", &blog_post_context)
            .expect("cannot create blog post template");

        let path = format!("assets/blog/{}", blog_info.title_slug);

        std::fs::create_dir_all(&path).expect("could not create dir");
        let mut file =
            File::create(format!("{}/index.html", &path)).expect("cannot create index.html file");

        file.write_all(rendered_blog_post_html.as_bytes())
            .expect("could not write data to html file");

        section.pages.push(Page {
            title: blog_post_context
                .get("title")
                .expect("could not get ctx")
                .to_string(),
            permalink: format!("/blog/{}", blog_info.title_slug),
        })
    }

    let rendered_home_html = template
        .render("index.html", &context)
        .expect("cannot create templated html");

    let mut file = File::create("assets/index.html").expect("cannot create index.html file");
    file.write_all(rendered_home_html.as_bytes())
        .expect("could not write data to html file");

    let rendered_posts_html = template
        .render(
            "section.html",
            &Context::from_serialize(&section).expect("could not serialize section"),
        )
        .expect("cannot create templated html for section");

    let mut file = File::create("assets/blog/index.html").expect("cannot create index.html file");
    file.write_all(rendered_posts_html.as_bytes())
        .expect("could not write data to blog section html file");
}
