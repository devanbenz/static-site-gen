---
title: "Global Hash Table's strike back!"
title_slug: "global-hash-tables"
date: 2025-06-12T11:50:58-06:00
description: "Analysis of Global hash table's strike back paper"
---

## TODO: Come up with header tag line

During my free time I happen to attend a [book club]() and during my working hours I attend a company papers reading group. 
This requires me to do a lot of reading! Which, if you enjoy reading about 
databases or operating system internals this is a *great* way to spend your free time. Recently I got incredibly lucky. The book club and 
my reading group at work are reading the same paper! That means, I get to discuss it with intelligent people--twice! The most recent reading 
was [Global Hash Tables Strike Back! An Analysis of Parallel GROUP BY Aggregation](https://arxiv.org/pdf/2505.04153). I figured today that I would
discuss a bit about this paper, what makes it interesting to me, and a few ideas surrounding it. 

But first, to better understand the why, we need to look at some foundational ideas.

* Hash tables and their use in databases.
* Push VS. Pull query evaluation. 
* Partitioning data; why this is a good thing--but also potentially a *slow* thing.

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

A `linear probe hash table`


A very simple `linear probe hash table` in rust could look something like the following.
```rust
struct HashTable {
    table: Vec<Option<(i32, i32)>>, 
}

impl HashTable {
    fn new() -> Self {
        Self { table: vec![None; 16] }
    }
    
    fn hash(&self, key: i32) -> usize {
        (key as usize) % self.table.len()
    }
    
    fn insert(&mut self, key: i32, value: i32) {
        let mut index = self.hash(key);
        while let Some((k, _)) = self.table[index] {
            if k == key { break; } 
            index = (index + 1) % self.table.len(); 
        }
        self.table[index] = Some((key, value));
    }
    
    fn get(&self, key: i32) -> Option<i32> {
        let mut index = self.hash(key);
        while let Some((k, v)) = self.table[index] {
            if k == key { return Some(v); }
            index = (index + 1) % self.table.len();
        }
        None
    }
}

```


## Paritioning!



## Push VS. Pull!
