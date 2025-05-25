---
title: "tpchgen-rs on a raspberry pi"
title_slug: "tpchgen-rs"
date: 2025-05-23T11:50:58-06:00
description: "Running tpchgen-rs on a Pi"
---

## Or how I learned to stop worrying and love the lack of resources

Recently I read through https://datafusion.apache.org/blog/2025/04/10/fastest-tpch-generator/ which discusses https://github.com/clflushopt/tpchgen-rs

> Blazing fast [TPCH](https://www.tpc.org/tpch/) benchmark data generator, in pure Rust with zero dependencies.

I was quite impressed by the metrics gathered by the team working on it. But, after taking a look at the machine they had used, `a Macbook Air M3 with 16GB of memory` I thought to myself... 16GB of memory? In this economy?\! So I dusted off my old Raspberry Pi with 4 whole gigabytes of memory (spoiler: it did not have 4 whole gigabytes of memory).

The TL;DR tpchgen-rs performs better than alternatives when it comes to generating TPC-H data.

You may be wondering, what even is TPC-H? And if you're not wondering that's fine because I'm going to tell you anyway\! As described by the specification:

> TPC-H is a decision support benchmark. It consists of a suite of business-oriented ad hoc queries and concurrent data modifications. The queries and the data populating the database have been chosen to have broad industry-wide relevance. This benchmark illustrates decision support systems that examine large volumes of data, execute queries with a high degree of complexity, and give answers to critical business questions.

Or, put plainly. TPC-H is a series of tables and queries to perform benchmarks on databases.

After SSH'ing in to my Raspberry Pi  

![rpispec.png](https://s3.amazonaws.com/whateverforever-img/rpispec.png)

*1GB of Memory*

It has 1GB of memory. I had my very own [Mandela Effect](https://en.wikipedia.org/wiki/Mandela\_Effect\_(disambiguation)) moment.

Regardless. The show must go on\! Unfortunately, this Pi was too under-powered for me to compile any modern Rust or C++ programs. So I took to building a statically linked binary for `tpcgen-cli` from the `tpcgen-rs` [repository](https://github.com/clflushopt/tpchgen-rs ). I also downloaded a `DuckDB` ARM binary for comparison later on.

In order to build for the rust target `armv7-unknown-linux-gnueabih` I had to first install the cross compiler for ARM and add the target.

```shell  
❯ sudo apt -y install gcc-arm-linux-gnueabihf && rustup target add armv7-unknown-linux-gnueabih  
```

And after running  
```shell  
❯ cargo build --target=armv7-unknown-linux-gnueabihf --release  
```

We get a cross built binary\! Ensuring that it's statically linked I can copy it over to my Pi.

```shell  
❯ cd target/armv7-unknown-linux-gnueabihf/release && file tpchgen-cli

tpchgen-cli: ELF 32-bit LSB executable, ARM, EABI5 version 1 (GNU/Linux), statically linked, BuildID[sha1]=f5292640e67555bfd6e0886ae33d99215abb4b4b, for GNU/Linux 3.2.0, not stripped  
```

I proceeded to run tpchgen-rs setting it to use a scale factor of 1 and output parquet as the file format. 

```shell  
❯ time ./tpchgen-cli -s 1 --format=parquet

real	1m15.101s  
user	2m59.192s  
sys 	0m7.555s  
```

Well... not too bad if I say so. A little over a minute to run at a scale factor of 1\. Alrighty--lets try out DuckDB next.

```shell  
❯ ./duckdb

D INSTALL tpch;  
D LOAD tpch;  
D CALL dbgen(sf = 1);

```

And finally after patiently waiting about a few minutes. The results are in\!

```shell  
client_loop: send disconnect: Broken pipe  
```

Unfortunately DuckDB eats up all the memory in about \~15 seconds and turns my Pi into a small space heater.

![pi_egg.jpg](https://s3.amazonaws.com/whateverforever-img/pi_egg.jpg)
> With a small amount of oil and egg mixture I was able to cook myself a nice breakfast. 

And that leads us to the performance comparison
![ddb_tpchgenrs.svg](https://s3.amazonaws.com/whateverforever-img/ddb_tpchgenrs.svg)

And now, dear reader, you may be wondering. What about higher scale factors\! Well fret you not. I also ran scale factors of 10 & 100\. Scale factor 10 actually performed quite well. Scale factor 100 on the other hand crashed after about 15 minutes.

The final results  

![all_cmp_r.svg](https://s3.amazonaws.com/whateverforever-img/all_cmp_r.svg)

---

Feel free to mosey on over to https://github.com/clflushopt/tpchgen-rs and give them a star.

Here's to building the next generation of big data tooling in Rust 🥂

