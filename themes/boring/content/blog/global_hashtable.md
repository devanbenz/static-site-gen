---
title: "Global Hash Tables strike back!"
title_slug: "global-hash-tables"
date: 2025-06-12T11:50:58-06:00
description: "Analysis of Global hash table's strike back paper"
---

During my free time I happen to attend a [book club]() and my working hours I attend a company papers reading group. 
This requires me to do a lot of reading! Which, if you enjoy reading about 
databases or operating system internals this is a *great* way to spend your time. Recently I got incredibly lucky. The book club and 
my reading group at work are reading the same paper! That means, I get to discuss it with intelligent people--twice! The most recent reading 
was [Global Hash Tables Strike Back! An Analysis of Parallel GROUP BY Aggregation](https://arxiv.org/pdf/2505.04153). I figured today that I would
discuss a bit about this paper, what makes it interesting to me, and a few ideas surrounding it. 

But first, to better understand the why, we need to look at some foundational ideas.

* Hash tables and their use in databases.
* Push VS. Pull query evaluation. 
* Partitioning data; why this is a good thing--but also potentially a performance bottleneck.

## Hash tables! 

Hash tables are a core data structure in most pieces of software. Databases are no exception. In the simplest terms a 
hash table will let you map keys to different values. The way that this works is by building an associative array using a hash function
to derive index keys. Or, in simpler terms, you take a key, turn it in to a number using a specialized function, and store it 
at that index in an array. 

```
keys         fn(n)      array  
                     ┌────────┐
             ┌──┐    │┌──────┐│
             │  │    ││      ││
 foo  ───────┼──┼────│►      ││
             │  │    ││      ││
             │  │    │└──────┘│
             │  │    │┌──────┐│
             │  │    ││      ││
 bar  ───────┼──┼────│►      ││
             │  │    ││      ││
             │  │    │└──────┘│
             │  │    │┌──────┐│
             │  │    ││      ││
 baz  ───────┼──┼────│►      ││
             │  │    ││      ││
             └──┘    │└──────┘│
                     └────────┘
```

Hash functions will tell us how to map the larger key down in to a smaller domain. Deciding on a good function to use is like the wild wild west, there are a ton to [choose from](https://github.com/rurban/smhasher) and many 
companies will roll their own. I personally would just stick with [xxHash](https://xxhash.com/) since it's widely used and likely has bindings for whatever programming language your heart desires. Note that hash functions care more about speed 
than cryptographic security. They are only meant to turn a key in to a hash value as an integer representation that can easily be used as an index. 

Okay, great! The general design of a hash table is all laid out, but, what happens when we have two keys that hash to the same value? There's only so many numbers you can use without the table being too large. 

*Collisions* can happen. And when they do happen, you need to account for them, much like everything else in software you need to have a fine balance of trade offs. One trade off you must decide is whether to use a `static hash table` or a `dynamic hash table`.
A `static hash table` is much less complex than a `dynamic hash table`, it is effectively a fixed size array. When you need more storage you simply rebuild a larger hash table (usually double in size) from scratch. Easy to deal with generally, but very very *expensive*. 
A `dynamic hash table` will use operations to grow the hash table which can lead to some complexity but at least you don't need to start over from scratch. 

The most common approach for a `static hash table` would be `linear probe hashing` (spoiler this is used in the paper), and for `dynamic hash tables` the most common approach is called `chained hashing`. 

A `linear probe hash table` will use a [circular buffer](https://en.wikipedia.org/wiki/Circular_buffer) to insert colliding keys. Generally in this hash table scheme you need a way to store tombstones (deleted data). Since 
rust has a `None` type we can easily achieve this using that value. Other programming languages may need a sentinel value to achieve this. 


A very simple `linear probe hash table` in rust could look something like the following.
```rust
use std::hash::Hash;
use xxhash_rust::const_xxh3::xxh3_64 as const_xxh3;

struct HashTable {
    table: Vec<Option<(String, String)>>,
}

impl HashTable {
    fn new() -> Self {
        Self { table: vec![None; 16] }
    }

    fn resize(&mut self) {
        let new_size = self.table.len() * 2;
        // Since String implements Clone this is fine
        // this is a simple example so we will just use the
        // resize primitive. Usually you will need to impl
        // Clone in rust if this was done using a generic.
        self.table.resize(new_size, None);
    }

    fn hash(&self, key: String) -> usize {
        // Using xxHash, hash the string
        // and get an index using modulo operator
        const_xxh3(key.as_bytes()) as usize % self.table.len()
    }

    fn insert(&mut self, key: String, value: String) {
        let key_index = self.hash(key.clone());
        let mut cur_index = key_index;

        // This is where the actual logic for linear probing will be during 
        // insert. If there is already a value in the slot index we would like to 
        // use you need to loop through the array and select the next empty index.
        // If the array is full then we will resize it and insert in to the next free 
        // slot.
        while let Some((_, val)) = self.table[cur_index].clone() {
            if val == value { break; }
            cur_index = (cur_index + 1) % self.table.len();

            if cur_index == key_index {
                cur_index = (self.table.len() + 1);
                self.resize();
                break
            }
        }

        // If there is None in the slot
        // the value can be inserted at the hashed key
        // index.
        self.table[cur_index] = Some((key, value));
    }

    fn get(&self, key: String) -> Option<String> {
        let mut index = self.hash(key.clone());
        while let Some((k, val)) = self.table[index].clone() {
            if k == key { return Some(val); }
            index = (index + 1) % self.table.len();
        }
        None
    }
}
```

For a `chained hashing` hash table we initialize it with a fixed table size. Each index within our table array will just hold a linked list. If you insert a value at a certain index 
and there is a key collision, you just simply traverse the linked list and insert it at the tail end. Pretty easy right? This is a very common dynamic hashing scheme due to its ease of 
implementation. 

And here is a simple example
```rust
use std::collections::LinkedList;
use std::hash::Hash;
use xxhash_rust::const_xxh3::xxh3_64 as const_xxh3;

struct HashTable {
    table: Vec<Option<LinkedList<(String, String)>>>,
}

impl HashTable {
    fn new() -> Self {
        Self { table: vec![None; 16] }
    }

    fn hash(&self, key: String) -> usize {
        // Using xxHash, hash the string
        // and get an index using modulo operator
        const_xxh3(key.as_bytes()) as usize % self.table.len()
    }

    fn insert(&mut self, key: String, value: String) {
        let key_index = self.hash(key.clone());

        // Logic for chained hashing, if there is already a value
        // at this slot index we will traverse a linked list and insert it at the
        // end of the list.
        if let Some(mut list) = self.table[key_index].clone() {
            while let Some((k, v)) = list.clone().iter_mut().next() {
                if *k == key {
                    *v = value.clone();
                    return;
                }
            }
            list.push_back((key, value));
        } else {
            // If there is None in the slot we can create a new list
            // and insert said list in to the slot
            let mut list = LinkedList::new();
            list.push_front((key, value));
            self.table[key_index] = Some(list);
        }
    }

    fn get(&self, key: String) -> Option<String> {
        let mut index = self.hash(key.clone());
        if let Some(list) = self.table[index].clone() {
            while let Some((k, v)) = list.clone().iter().next() {
                if k.eq(&key) {
                    return Some(v.clone());
                }
            }
        }
        None
    }
}
```

And thus with the magic of linked lists ([which rust actually states it's always better to use a `Vec` or `VecDeque`](https://doc.rust-lang.org/std/collections/struct.LinkedList.html)) you can build a 
hash table that will grow without the need to resize. Of course there is a trade off here, do you make it larger to begin with, or do you make it smaller? Those are some design decisions that can be an
exercise to the reader. 

Hash table usage in database systems is vast, just a few things they are used for
* Internal meta-data that keeps track of information about the database and it's system state (page tables, page directories).
* Core data storage; some structures that hold actual records in the DBMS will use hash tables. 
* Temporary data storage; sometimes when performing a join or GROUP BY (hence this paper) you will need to build a hash table on the fly.
* Table indices; used as additional structures to help locate specific records. 

## Push VS. Pull!

Next up, lets discuss *query evaluation*. There are two dominate methodologies for query evaluation in database systems. 

1. Pull based (volcano/iterator)
2. Push based (morsel driven)

I'll do my best to explain the core difference between these systems briefly, but if you have time I would suggest reading this [amazing blog post](https://justinjaffray.com/query-engines-push-vs.-pull/) by
Justin Jaffrey. He gives a great explaination. 

SQL queries are parsed and then transformed in to a tree (or DAG) of operators used to perform actions on data. The culmination of these actions will retrieve the specific records you need from your DBMS. 

For example; let's say we have the following query

```sql
SELECT name FROM customers WHERE products > 10 GROUP BY name
```

Which as represented by its operators would look something like this

![global_ht_query](https://s3.amazonaws.com/whateverforever-img/global_ht_query.svg)

For pull based query evaluation we would start at the root node of this tree and have each operator 
"pull" data up from its children. The most common approach to this is something called the [volcano model](https://cs-people.bu.edu/mathan/reading-groups/papers-classics/volcano.pdf). 
Effectively all operators implement the same iterator interface establishing a `next` method. In this query evaluation model all parent operators rely on something coined a 
`demand-driven` data flow. They will only call `next` when they need data from their children. The volcano model assumes that this is done a single record at a time, more modern OLAP systems
such as [Apache Datafusion]() use a vectorized version of volcano batching records on each call to `next`.

So if we were to perform a logical pull query evaluation on our operators above we would see something like this

```
Aggregate(name) <| Project(name) <| Select(products > 10) <| customers
```
Where `Aggregate(name)` is emitting data from `Project(name)` which in turn is emtting data from `Select(products > 10)` and finally `Select(products > 10)` 
is emitting data from `customers`. There are various other nuances to pull based query evaluation but this is the gist of it. 

On to push based query evaluation! 

Since pull based query evaluation starts from the root node, one has to assume that push based also must start at the root node! Nope, just kidding. It starts from the leaf nodes 
and pushes data up to the parents. This would be considered a `data-drive` data flow. 

## Paritioning!



