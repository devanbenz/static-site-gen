---
title: "Writing a static site generator for fun and (no) profit"
title_slug: "ssg"
date: 2024-04-08T18:50:58-06:00
description: "I've completely over-engineered this blog and wrote my own SSG engine."
tags: [ Personal, Rust, Intro ]
---

> Do you think God stays in heaven because he too lives in fear of what he has created?

*- Steve Buscemi (Spy kids 2: The Island of Lost Dreams)*

---

### Static site generators: how do they work?

What is a static site generator? It's a pretty concise design that can be broken down as follows:

`text files (in this case markdown) -> build step -> outputs static assets`

For this project I'm going to need to break it down in to the following steps

1. Write HTML template(s)
2. Render HTML template(s) in code
3. Write Markdown
4. Parse Markdown files in to HTML
5. Create a CLI interface for local development & generating static assets
6. Build out a continuous deployment pipeline to send said static assets to an S3 bucket
7. Host static site
8. ???
9. (No) profit!

What language will I choose for this project? I personally like Rust - even though this really does not need to be
performant whatsoever... who cares - Rust is fun!

Where shall we start?

### Templating

HTML templating. What is HTML templating? Let's take a look at Tera - a Rust templating library. Oh, look! It has a
quick overview of the templated HTML right there on the front page.

```jinja2
<title>{% block title %}{% endblock title %}</title>
<ul>
    {% for user in users -%}
    <li><a href="{{ user.url }}">{{ user.username }}</a></li>
    {%- endfor %}
</ul>
```

> Inspired by Jinja2 and Django templates

Great! I have never used Jinja2 or Django. Anyway.

Tera has three kinds of delimiters
`{{` and `}}`for expressions `{%` and `%}`for statements `{#` and `#}`for comments

So looking at the block above `{% block title %}{% endblock title %}`
and `{% for user in users -%}` ... `{%- endfor %}` are statements,
`{{ user.username }}` is an expression and there are no comments.

Okay cool. Blocks; makes sense, for loops; makes sense, statements are just like functions, loops, and selections within
code.
Doing a cursory glance through the documentation reveals that you use `{% extend "<file>.html" %}` with
the `block` statement. This allows for you to template across multiple html files.

Looking at expressions those appear to just be variables. Okay well. I'll come back to the template docs as needed.
There
are a few more sections, but I think this is workable at the moment. Now to figure out how to generate html within my
Rust
codebase!

Let's take some of the code from the quick start

`main.rs`

```rust
use tera::Tera;

fn main() {
    let tera = match Tera::new("templates/**/*.html") {
        Ok(t) => t,
        Err(e) => {
            println!("Parsing error(s): {}", e);
            ::std::process::exit(1);
        }
    };
}
```

I'll need to add `tera = "1.19.1"` to my `Cargo.toml`. Let's just throw a `base.html` in `templates/blog` to try out
some basic parsing.

`base.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <style type="text/css">
        .important {
            color: #fc0335;
        }
    </style>
    <title>{{ title }}</title>
</head>
<body>
<div id="content">
    <p class="important">
        {{ content }}
    </p>
</div>
</body>
</html>
```

`cargo run` builds and runs without error. That's good! I should probably make it so the tera templating is done within
a `lazy_static` macro since this only needs to happen once. We can add the `lazy_static = "1.4.0` to `Cargo.toml` to
make this happen.

> `lazy_static` Using this macro, it is possible to have`static`s that require code to be executed at runtime in order
> to be initialized. This includes anything requiring heap allocations, like vectors or hash maps, as well as anything
> that requires function calls to be computed https://docs.rs/lazy_static/latest/lazy_static/

Updating `main.rs` results in

```rust
use lazy_static::lazy_static;
use tera::Tera;

fn main() {
    lazy_static! {  
	    static ref TEMPLATE: Tera = {  
	        let tera = match Tera::new("templates/**/*.html") {  
	            Ok(t) => t,  
	            Err(e) => {  
	                println!("Parsing error(s): {}", e);  
	                ::std::process::exit(1);  
	            }        
            };  
        tera  
	    };  
	}
}
```

Now taking a look back at the Tera documentation I see
> You need two things to render a template: a name and a context.

I'm going to go ahead and add a `tera::Context` to my codebase

```rust
let mut context = tera::Context::new();

context.insert("title", "Planet Express logistics co.");
context.insert("content", "Shut up and take my money!");
```

and now lets render this!

``` rust
TEMPLATE  
    .render("assets/index.html", &context)  
    .expect("could not render");
```

The moment I've been waiting for!
`cargo run`

and!

...

```
Finished dev [unoptimized + debuginfo] target(s) in 0.03s
     Running `target/debug/ssg-demo`
thread 'main' panicked at src/main.rs:26:10:
could not render: Error { kind: TemplateNotFound("assets/index.html"), source: None }
```

:(

Okay so it appears that I need to use the actual *name* of the template for rendering and not what I want to render to.
This is probably why it's a good idea to read all the documentation. Let's fix that!

``` rust
TEMPLATE  
    .render("blog/base.html", &context)  
    .expect("could not render");
```

> If you are using globs, Tera will automatically remove the glob prefix from the template names. To use our example
> from before, the template name for the file located at`templates/hello.html`will be`hello.html`.

Keeping that in mind I've set it to render from `blog/base.html` since I'm using globbing i.e. `templates/**/*.html`.
Calling the render method on `TEMPLATE` appears to produce a `String` type. If I go ahead and print it out we see the
fully rendered HTML

```rust
let out = TEMPLATE.render("blog/base.html", & context).expect("could not render");

println!("{}", out);
```

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <style type="text/css">
        .important {
            color: #fc0335;
        }
    </style>
    <title>Planet Express logistics co.</title>
</head>
<body>
<div id="content">
    <p class="important">
        Shut up and take my money!
    </p>
</div>
</body>
</html>
```

Cool! Now in order to create a static assets directory and write this data to a file we can use some built in methods
for
file I/O such as `fs::std::create_dir_all()` which will create a directory in our filesystem if it does not exist
and `File::create()`
which is pretty straight forward, it creates a file.

Our finished rust code looks like:

```rust
use lazy_static::lazy_static;
use std::fs::File;
use std::io::Write;
use tera::{Context, Tera};

fn main() {
    lazy_static! {
        static ref TEMPLATE: Tera = {
            let tera = match Tera::new("templates/**/*.html") {
                Ok(t) => t,
                Err(e) => {
                    println!("Parsing error(s): {}", e);
                    ::std::process::exit(1);
                }
            };

            tera
        };
    }

    let mut context = Context::new();

    context.insert("title", "Planet Express logistics co.");
    context.insert("content", "Shut up and take my money!");

    let out = TEMPLATE
        .render("blog/base.html", &context)
        .expect("could not render");

    let path = "assets";
    std::fs::create_dir_all(path).expect("could not create directory");
    let mut file = File::create(format!("{}/index.html", path)).expect("could not create file");

    file.write_all(out.as_bytes())
        .expect("could not write data to html file");
}
```

When running `cargo run` there is a valid HTML file that can be viewed in the browser!

### Parsing markdown

This will not entirely be the case... we are technically parsing both YAML and Markdown here. The structure of my posts
will be something like so

```markdown
---
title: "Love's Labor's Lost in Space"
title_slug: "llis"
date: 2024-04-08T18:50:58-06:00
description: "Vergon 6 was once filled with a super-dense substance known as dark matter, each pound of which weighs over ten thousand pounds."
---

# What about the animals?

" I didn't say anything about animals. Now it seems that the planet will collapse within three days. Incidentally, this
will kill all the animals."

```

As we can see there is some YAML before the actual Markdown syntax. This is referred to
as [front matter](https://jekyllrb.com/docs/front-matter/).  
