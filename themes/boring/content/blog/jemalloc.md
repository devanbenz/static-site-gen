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

### arenas, two (or more) threads enter, one (or more) allocation leaves!

The primary reason for the creation of `jemalloc` is exactly as the paper title alludes to, scalability for multi-threaded/multi-processor systems. You see, back in the early aughts FreeBSD's default implementation of 
`malloc` was lagging behind on performance for multi-threaded applications on multi-core systems. Hardware was improving so software needed to adapt. This version of `malloc` called `dlmalloc` would effectively
[hold a global heap mutex wrapper around function calls](https://github.com/ennorehling/dlmalloc/blob/71296436f979a350870e10b869ccfd28bfcc17e4/malloc.c#L136-L150). Clearly this was not scalable as software
needed to catch up with the emergence of multi core systems and heavier usage of concurrency in application code. And thus, `jemalloc` was one memory allocator that found its way on to the scene
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

output of strace

```
execve("./a.out", ["./a.out"], 0x7ffe5079fa40 /* 29 vars */) = 0
brk(NULL)                               = 0x5bb8609c3000
arch_prctl(0x3001 /* ARCH_??? */, 0x7ffc1dc9e2f0) = -1 EINVAL (Invalid argument)
mmap(NULL, 8192, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0) = 0x7860ee003000
access("/etc/ld.so.preload", R_OK)      = -1 ENOENT (No such file or directory)
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3
newfstatat(3, "", {st_mode=S_IFREG|0644, st_size=31076, ...}, AT_EMPTY_PATH) = 0
mmap(NULL, 31076, PROT_READ, MAP_PRIVATE, 3, 0) = 0x7860edffb000
close(3)                                = 0
openat(AT_FDCWD, "/lib/x86_64-linux-gnu/libc.so.6", O_RDONLY|O_CLOEXEC) = 3
read(3, "\177ELF\2\1\1\3\0\0\0\0\0\0\0\0\3\0>\0\1\0\0\0P\237\2\0\0\0\0\0"..., 832) = 832
pread64(3, "\6\0\0\0\4\0\0\0@\0\0\0\0\0\0\0@\0\0\0\0\0\0\0@\0\0\0\0\0\0\0"..., 784, 64) = 784
pread64(3, "\4\0\0\0 \0\0\0\5\0\0\0GNU\0\2\0\0\300\4\0\0\0\3\0\0\0\0\0\0\0"..., 48, 848) = 48
pread64(3, "\4\0\0\0\24\0\0\0\3\0\0\0GNU\0\325\31p\226\367\t\200\30)\261\30\257\33|\366c"..., 68, 896) = 68
newfstatat(3, "", {st_mode=S_IFREG|0755, st_size=2220400, ...}, AT_EMPTY_PATH) = 0
pread64(3, "\6\0\0\0\4\0\0\0@\0\0\0\0\0\0\0@\0\0\0\0\0\0\0@\0\0\0\0\0\0\0"..., 784, 64) = 784
mmap(NULL, 2264656, PROT_READ, MAP_PRIVATE|MAP_DENYWRITE, 3, 0) = 0x7860edc00000
mprotect(0x7860edc28000, 2023424, PROT_NONE) = 0
mmap(0x7860edc28000, 1658880, PROT_READ|PROT_EXEC, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x28000) = 0x7860edc28000
mmap(0x7860eddbd000, 360448, PROT_READ, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x1bd000) = 0x7860eddbd000
mmap(0x7860ede16000, 24576, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x215000) = 0x7860ede16000
mmap(0x7860ede1c000, 52816, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_FIXED|MAP_ANONYMOUS, -1, 0) = 0x7860ede1c000
close(3)                                = 0
mmap(NULL, 12288, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0) = 0x7860edff8000
arch_prctl(ARCH_SET_FS, 0x7860edff8740) = 0
set_tid_address(0x7860edff8a10)         = 15814
set_robust_list(0x7860edff8a20, 24)     = 0
rseq(0x7860edff90e0, 0x20, 0, 0x53053053) = 0
mprotect(0x7860ede16000, 16384, PROT_READ) = 0
mprotect(0x5bb84d336000, 4096, PROT_READ) = 0
mprotect(0x7860ee03d000, 8192, PROT_READ) = 0
prlimit64(0, RLIMIT_STACK, NULL, {rlim_cur=8192*1024, rlim_max=RLIM64_INFINITY}) = 0
munmap(0x7860edffb000, 31076)           = 0
getrandom("\x03\x66\x47\xcf\x1c\xd9\xdc\x63", 8, GRND_NONBLOCK) = 8
brk(NULL)                               = 0x5bb8609c3000
brk(0x5bb8609e4000)                     = 0x5bb8609e4000
exit_group(0)                           = ?
+++ exited with 0 +++
```

```
devan גּ desky ~/documents/blog_posts_code/jemalloc
 --> strace -e mmap ./with_jemalloc
mmap(NULL, 8192, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0) = 0x7971bf9cf000
mmap(NULL, 31200, PROT_READ, MAP_PRIVATE, 3, 0) = 0x7971bf9c7000
mmap(NULL, 2987664, PROT_READ, MAP_PRIVATE|MAP_DENYWRITE, 3, 0) = 0x7971bf600000
mmap(0x7971bf606000, 643072, PROT_READ|PROT_EXEC, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x6000) = 0x7971bf606000
mmap(0x7971bf6a3000, 53248, PROT_READ, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0xa3000) = 0x7971bf6a3000
mmap(0x7971bf6b1000, 24576, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0xb0000) = 0x7971bf6b1000
mmap(0x7971bf6b7000, 2238096, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_FIXED|MAP_ANONYMOUS, -1, 0) = 0x7971bf6b7000
mmap(NULL, 2264656, PROT_READ, MAP_PRIVATE|MAP_DENYWRITE, 3, 0) = 0x7971bf200000
mmap(0x7971bf228000, 1658880, PROT_READ|PROT_EXEC, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x28000) = 0x7971bf228000
mmap(0x7971bf3bd000, 360448, PROT_READ, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x1bd000) = 0x7971bf3bd000
mmap(0x7971bf416000, 24576, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x215000) = 0x7971bf416000
mmap(0x7971bf41c000, 52816, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_FIXED|MAP_ANONYMOUS, -1, 0) = 0x7971bf41c000
mmap(NULL, 942344, PROT_READ, MAP_PRIVATE|MAP_DENYWRITE, 3, 0) = 0x7971bf8e0000
mmap(0x7971bf8ee000, 507904, PROT_READ|PROT_EXEC, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0xe000) = 0x7971bf8ee000
mmap(0x7971bf96a000, 372736, PROT_READ, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x8a000) = 0x7971bf96a000
mmap(0x7971bf9c5000, 8192, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0xe4000) = 0x7971bf9c5000
mmap(NULL, 2275520, PROT_READ, MAP_PRIVATE|MAP_DENYWRITE, 3, 0) = 0x7971bee00000
mmap(0x7971bee9a000, 1118208, PROT_READ|PROT_EXEC, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x9a000) = 0x7971bee9a000
mmap(0x7971befab000, 454656, PROT_READ, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x1ab000) = 0x7971befab000
mmap(0x7971bf01b000, 57344, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x21a000) = 0x7971bf01b000
mmap(0x7971bf029000, 10432, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_FIXED|MAP_ANONYMOUS, -1, 0) = 0x7971bf029000
mmap(NULL, 127720, PROT_READ, MAP_PRIVATE|MAP_DENYWRITE, 3, 0) = 0x7971bf5e0000
mmap(0x7971bf5e3000, 94208, PROT_READ|PROT_EXEC, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x3000) = 0x7971bf5e3000
mmap(0x7971bf5fa000, 16384, PROT_READ, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x1a000) = 0x7971bf5fa000
mmap(0x7971bf5fe000, 8192, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x1d000) = 0x7971bf5fe000
mmap(NULL, 8192, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0) = 0x7971bf8de000
mmap(NULL, 16384, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0) = 0x7971bf8da000
mmap(NULL, 8192, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0) = 0x7971bf5de000
mmap(NULL, 4096, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS|MAP_NORESERVE, -1, 0) = 0x7971bfa08000
mmap(NULL, 2097152, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS|MAP_NORESERVE, -1, 0) = 0x7971bec00000
mmap(NULL, 2097152, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS|MAP_NORESERVE, -1, 0) = 0x7971bea00000
mmap(NULL, 4194304, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS|MAP_NORESERVE, -1, 0) = 0x7971be600000
+++ exited with 0 +++
devan גּ desky ~/documents/blog_posts_code/jemalloc
 --> strace -e mmap ./with_malloc
mmap(NULL, 8192, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0) = 0x7be8122bd000
mmap(NULL, 31200, PROT_READ, MAP_PRIVATE, 3, 0) = 0x7be8122b5000
mmap(NULL, 2264656, PROT_READ, MAP_PRIVATE|MAP_DENYWRITE, 3, 0) = 0x7be812000000
mmap(0x7be812028000, 1658880, PROT_READ|PROT_EXEC, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x28000) = 0x7be812028000
mmap(0x7be8121bd000, 360448, PROT_READ, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x1bd000) = 0x7be8121bd000
mmap(0x7be812216000, 24576, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x215000) = 0x7be812216000
mmap(0x7be81221c000, 52816, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_FIXED|MAP_ANONYMOUS, -1, 0) = 0x7be81221c000
mmap(NULL, 12288, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0) = 0x7be8122b2000
+++ exited with 0 +++
```




### f#$king syscalls, how do they work? 

### results
