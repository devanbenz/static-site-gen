---
title: "jemalloc"
title_slug: "jemalloc"
date: 2025-06-02T11:50:58-06:00
description: "Analysis of jemalloc, a concurrent scallable malloc."
---

#### Why does everyone who writes an allocater prepend it with their initials???

When writing software there is an unsung hero, memory allocation. When it comes to memory allocation there are two primary camps:

1. Using a garbage collector for automatic memory management
2. Using language primitives for manual memory management

Using a language that has a garbage collector memory management is not something you as the programmer needs to take in to account. 
The garbage collector is sitting idly by, watching everything you do, judging your careless declaration of objects and constantly cleaning up for you. Other languages that don't 
take advantage of a garbage collector are not so kind. Manual memory management is done in various different ways throughout many different languages and that is precisely the most recent topic we read about in my
papers reading group at work. Specifically we read through [A Scalable Concurrent malloc(3) Implementation for FreeBSD](https://people.freebsd.org/~jasone/jemalloc/bsdcan2006/jemalloc.pdf).

So, before diving in to some topics from the paper. How exactly does memory allocation work when you need to manage it yourself?

There are two primary memory regions for application code to use, the `stack` and the `heap`. The `stack` is where primitive data types are defined, think `i32`, `bool`, and `f32` type variables.
The `heap` on the other hand is for more complex data types, a `String` or a `struct` is a good example of variables that get declared here. The `heap` needs to have memory allocated and deallocated.

C/C++ can use a method called `malloc` to perform memory allocation

```cpp
#include <stdio.h>   
#include <stdlib.h> 
 
int main(void) {
    int *p1 = malloc(4*sizeof(int));  // allocates enough for an array of 4 int
    int *p2 = malloc(sizeof(int[4])); // same, naming the type directly
    int *p3 = malloc(4*sizeof *p3);   // same, without repeating the type name
 
    if(p1) {
        for(int n=0; n<4; ++n) // populate the array
            p1[n] = n*n;
        for(int n=0; n<4; ++n) // print it back out
            printf("p1[%d] == %d\n", n, p1[n]);
    }
 
    free(p1);
    free(p2);
    free(p3);
}
```

Calling `free` will deallocate the memory.

Rust, which I hear is all the rage due to its memory safety, doesn't require you to call `malloc` or `free`.
Instead, Rust uses the idea of `ownership` and `borrowing` which effectively will declare objects on the heap for you
and as soon as it leaves the scope Rust will call `drop` to perform automatic resource cleanup. This technique is also 
known as `RAII` (Resource acquisition is initialization) and was popularized by C++. 

```rust
fn main() {
    {
        let s = String::from("hello"); // s is valid from this point forward

        // do stuff with s
    }                                  // this scope s now over, and s is no
                                       // longer valid
}
```
> One of the reasons C has bugs due to 'memory safety' is often caused by calling free too much or too little, either leaving dangling pointers
around or double-freeing. Wrangling around mallocs and frees all over the place can be quite unwieldy!

There are various other ways to allocate and deallocate memory both in C++ and Rust. I suggest giving [the rust ownership doc]() a read if you're more interested in the
intricacies of memory management in Rust. Or if you're a masochist the [memory management C++ reference doc](https://en.cppreference.com/w/cpp/memory.html).

Now without further a'do, there are plenty of interesting ideas that went in to the creation of `jemalloc`. 

Which leads us to

### arenas, two (or more) threads enter, one (or more) allocation leaves!

The primary reasoning for `jemalloc` was exactly as the paper title alludes to, scalability for multi-threaded/multi-processor systems. You see, back in the early aughts FreeBSD's default implementation of 
`malloc` was lagging behind on performance for multi-threaded applications on multi-core systems. Hardware was improving so software needed to adapt. This version of `malloc` called `dlmalloc` would effectively
[hold a global heap mutex wrapper around function calls](https://github.com/ennorehling/dlmalloc/blob/71296436f979a350870e10b869ccfd28bfcc17e4/malloc.c#L136-L150). Clearly this was not scalable as software
needed to catch up with the emergence of multi core systems and heavier usage of concurrency multi-threading in application code. And thus, `jemalloc` was one memory allocator that found its way on to the scene
to help alleviate the problems with `dlmalloc` usage in highly concurrent settings. 

Alright, cool, cool, cool. So how exactly does `jemalloc` account for multiple threads? 

It utilizes a neat idea called an `arena` and then assigns threads to specific arenas. 
Arena's are basically a data structure that maintains a large chunk of already allocated memory for an application to use. 
For example, lets say you have a small C program using good ol' `dlmalloc`. 

```c
int main(void) {
       struct bar_t {
        int a;
        char b[512];
    };

    bar_t *p = (bar_t*)malloc(sizeof(bar_t));

    if (p != nullptr) {
        p->a = 100;
        strcpy(p->b, "Planet Express");
    }

    free(p); 
}
```


### f#$king syscalls, how do they work? 

### results
