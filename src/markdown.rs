use glob::glob;
use std::fs::File;
use std::io::Read;
use std::process;
use yaml_rust::yaml::Hash;
use yaml_rust::Yaml;

pub fn get_info_value(key: String, value: &Hash) -> Option<String> {
    let mut value_from_yaml: Option<String> = None;
    if let Some(maybe_data) = value.get(&Yaml::String(key)) {
        value_from_yaml = Option::from(
            maybe_data
                .as_str()
                .expect("cannot parse string for data")
                .to_string(),
        );
    }

    value_from_yaml
}

pub fn generate_markdown_from_files() -> Vec<String> {
    let mut contents: Vec<String> = Vec::new();
    for md_file in glob("themes/boring/content/blog/*.md").expect("could not read markdown files") {
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
