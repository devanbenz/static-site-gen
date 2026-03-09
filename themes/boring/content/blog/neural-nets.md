---
title: "Zero to Neural Nets"
title_slug: "nn"
date: 2026-03-07T18:50:58-06:00
description: "From zero to training an mnist data set"
---

Starting out the year strong from one of my 2026 themes `Creativity` I have spent the past few months really deep diving in to AI/ML fundamentals. 
I started off recommending the book [Build a Simple Deep Learning Library](https://zekcrates.quarto.pub/deep-learning-library/intro.html) in a book club hosted by a friend of mine. We previously
read through `Database Internals`. It's an *excellent* read, I'm already familiar with databases and what makes them tick so it wasn't too much of a strain on the brain. This time around, my brain is understanding
*HARD*. In this post I'm going to discuss building a neural network that can recognize hand-written digits (the "Hello, World!" of AI/ML), and the rabbit holes I had to dive in to along the way.

### Picking Up the Deep Learning Book
In early February the book club I'm in finished `Database Internals` and we were on to the next one. I had recommended [Build a Simple Deep Learning Library](https://zekcrates.quarto.pub/deep-learning-library/intro.html). 
It was voted on as being the book to read, this did not last too long since the book itself requires a *TON* of pre-requisite information, not only that, the author did not do a very good job of explaining topics very well. 
The host of our book club (who's special interest is ML) recommended a [neural network video series by 3Brown1Blue](https://www.youtube.com/watch?v=aircAruvnKk&list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi). We picked this up and 
rolled with it. A goal that started out as reading a book about deep learning evolved in to a goal to just build an ML project from the ground up. 

So I cracked my knuckles, got my hands on the keyboard and created a local Rust crate for my tensor library. The goal is to build something similar to `pytorch` and use that to train a basic neural network on MNIST data 
to recognize hand-written digits. 

> [MNIST]() is a training data-set of 10's of thousands hand-written digits that are labeled for training. In this case what we're doing is 'supervised machine learning'. We are 
feeding data to the neural network in a controlled setting to ensure it can make predictions based off data it has never seen before. 

#### What exactly is a Tensor?

From [Wikipedia]():

> In mathematics, a tensor is an algebraic object that describes a multilinear relationship between sets of algebraic objects associated with a vector space. Tensors may map between different objects such as vectors, scalars, and even other tensors.

Great! If you're someone like me who only remembers high-school algebra, this makes zero sense. 

In lay-programmer terms a `tensor` is basically a multi-dimensional array

> Note: The `tensor` we are discussing is likely [different than tensors used in physics and pure mathematics.](https://stats.stackexchange.com/a/198395)

You could visualize a basic tensor like so:
```rust
let tensor = vec![1, 2, 3, 4] // Order 1 tensor

let tensor = vec![[1, 2, 3, 4],
                  [1, 2, 3, 4]] // Order 2 tensor

let tensor = vec![[[1, 2], [3, 4]],
                   [[1, 2], [3, 4]]] // Order 3 tensor
// ..... and so on

```
Assuming folks reading this are familiar with matrices and vectors, these two things are effectively generalizations of tensors.

For my own tensor library I am using [ndarray]() as the inner data for each `Tensor` object. This n-dimensional array is paired with metadata about the container. This metadata contains the following information:

- shape: (Depth, Width, Height) of the tensor data
- dtype: The datatype of the tensor, this would usually be `float64` in my case.
- device: The device to perform tensor operations on (usually CPU or GPU)

Taking a look at my example vec's above you could think of the tensor shapes to be:

- [4]
- [4, 2]
- [2, 2, 2]

So how exactly are these used by a neural network to train and make predictions on data?

#### Basic neural network design



- Started with a book that builds a DL library from scratch (mid-February)
- Worked through implementing `backward()` on a per-operation basis: Add, Mul, Sub, Pow
- The `out_grad` concept crystallized here: it's the incoming gradient, and you multiply it by your local derivative at each step
- **Revelation**: Backpropagation isn't magic — it's just applying the chain rule backwards through a graph of operations

## Wait, Math! I Don't Know Math!
- The book assumed calculus and linear algebra knowledge that wasn't there
- Realized you can't fake-it-till-you-make-it through gradient descent without understanding what a gradient actually is
- Detour into math fundamentals became the most valuable part of the journey

## Required Math: Basic Calculus and Linear Algebra

### Journey to Khan Academy
- **Starting point**: I have high school algebra knowledge--comfortable with functions and equations, but no calculus
- **Learning about derivatives** (early February):
  - What is a derivative? Rate of change. The slope of a function at a point.
  - Power rule, critical points, optimization
  - Used Rust and Python libraries to visualize curves and their derivatives
  - **Key insight**: Without understanding "rate of change," gradients are just hand-waving
- **Learning about the chain rule**:
  - If `y = f(g(x))`, then `dy/dx = f'(g(x)) * g'(x)`
  - Worked through `f(x) = (x - 1)^2` by hand: `f'(x) = 2(x-1)` — the derivative tells you which direction to adjust and by how much
  - **The question that made it click**: "Isn't backpropagation just the multivariable chain rule applied systematically?" Yes. That's literally all it is.
- **Learning about gradients** (February 9):
  - Entered multi-variable calculus territory: partial derivatives, then gradients
  - A gradient is all partial derivatives collected into a vector pointing in the direction of steepest increase
  - Calculated gradients by hand for multi-variable functions
  - **Geometric revelation**: The gradient points uphill. The *negative* gradient points downhill. Gradient *descent* subtracts the gradient to walk downhill toward the minimum. Gradient *ascent* (used in reinforcement learning) adds it.

## What's a Tensor?

### Reading Through PyTorch Internals Blog
- Built a mental model of what tensors actually are under the hood
- Understood that a tensor is fundamentally: data + shape + strides + metadata (dtype, device, requires_grad)

### Writing a Small POC Tensor Library in Rust
- Built `bbgrad` — ~2,100 lines of Rust across 9 source files
- Core type: `Tensor<T>` backed by `ndarray` with dynamic dimensions (`IxDyn`)
- Used `Arc<RwLock<...>>` for shared ownership — the Rust equivalent of PyTorch's reference-counted tensors
- Builder pattern for construction: `FloatTensorBuilder::new().with_ndarray(...).with_grad(true).build()`
- Operator overloading via `std::ops` traits: `+`, `-`, `*`, `/` all work on tensors
- Wrote a declarative macro (`impl_tensor_op!`) to generate scalar-tensor operations for both orderings (`tensor + 5.0` and `5.0 + tensor`)
- **Benchmarking win**: Rust implementation actually beat NumPy on some element-wise operations

### How Linear Algebra Uses Tensors for Operations
- Matrix-vector multiplication as "compute all neuron activations at once" — from 3B1B exercises
- A weight matrix `W` times input vector `x` isn't a scalar; each row of `W` produces one output entry
- The forward pass is just: `sigmoid(W @ x + b)` at each layer

### Forward Passes
- Implemented via a `Forward` trait — each operation (Add, MatMul, Sigmoid, etc.) implements `.forward()`
- The trait's `call()` method automatically records inputs and operations into the computation graph when any input has `requires_grad=true`
- 19-variant `TensorOp` enum tracks which operation created each tensor

### Backward Passes
- Implemented via a `Backward` trait — each operation computes its local gradient
- Reverse-mode autodiff: walk the graph backward from loss to inputs
- Completed backward implementations: Add, Sub, Mul, MatMul, Pow, Sum, Sigmoid, Softmax, ScalarAdd
- **The hardest one**: MatMul backward — `dL/dW = X^T @ upstream_grad` and `dL/dX = upstream_grad @ W^T`. The trick: "what was the other thing it was multiplied by?" then transpose it and put it on the correct side.
- Still `todo!()`: Div, Neg, ReLU, Tanh, Log, Exp, and several others

## Deep Learning Book Is Less Than Helpful, Toss That Out
- The book's approach wasn't clicking with the way the concepts were being internalized
- Switched to a more visual/intuitive approach

## Watching 3Blue1Brown Videos
- Studied the neural network video series (chapters 1-2) as theoretical foundation
- Forward pass mechanics, activation functions (sigmoid, ReLU), cost functions, gradient descent
- Worked through simplified examples: 2x2 matrices, 4-pixel toy images

### Using Claude's 'learning-opportunities' Plugin After Watching 3B1B Vids
- After each video, worked through interactive exercises to solidify understanding
- **Why squaring in MSE**: Squared differences disproportionately punish large errors, and the smooth derivative of `x^2` (vs. the sharp corner of `|x|`) is essential for gradient descent to work
- **Understanding which tensors need gradients**: Weights and biases need `requires_grad` (they're what you're optimizing). Input data does not.
- **How sigmoid applies element-wise**: It's just `1 / (1 + e^(-x))` applied independently to each element of a vector

## MNIST

### What Is It?
- 70,000 handwritten digit images (28x28 pixels = 784 values each)
- Labels: digits 0-9
- The "Hello, World!" of deep learning

### "Hello, World!" of Deep Learning and Neural Networks
- CSV format: first column = label, remaining 784 = pixel values
- Preprocessing: divide pixels by 255.0 (normalize to 0-1 range, important for sigmoid activations)
- Reshape flat 784 values into `[784, 1]` column vectors
- Labels one-hot encoded: digit 3 becomes `[0,0,0,1,0,0,0,0,0,0]`

## Perceptrons

### Architecture: 784 -> 16 -> 16 -> 10
```rust
PerceptronBuilder::new((-1.0, 1.0))  // random weight init range
    .with_layer(784)   // input layer (one pixel per neuron)
    .with_layer(16)    // hidden layer 1
    .with_layer(16)    // hidden layer 2
    .with_layer(10)    // output layer (one per digit)
    .build()
```
- Hidden layers: `sigmoid(W @ x + b)`
- Output layer: `softmax(W @ x + b)` (converts raw scores to probabilities)
- Loss: MSE — `(prediction - target).pow(2).sum()`
- Optimizer: Vanilla SGD — `weight := weight - learning_rate * gradient` with `lr = 0.01`

### How the Training Loop Works with MNIST Dataset
1. Zero all gradients
2. Forward pass: feed image through layers
3. Compute loss: MSE between prediction and one-hot target
4. Backward pass: compute gradients through the entire graph
5. Update weights: subtract `learning_rate * gradient` from each weight and bias
6. Repeat for every image in the training set
- No batching — single-sample updates (each `[784, 1]` image processed individually)
- Evaluation: `argmax` on the 10-element output vector to get predicted digit

### The Journey from 10% to ~80% Accuracy
- **10% accuracy = random guessing** (1 in 10 digits)
- **Bug: measuring accuracy wrong** — initially used "loss <= 0.5" as the accuracy metric, which gave ~4.5% (worse than random!). **Breakthrough**: loss is for training (continuous error signal), argmax is for evaluation (pick the class with highest probability).
- **Bug: loss computed outside the computation graph** — the original `loss()` method did raw ndarray math, so gradients couldn't flow through it. Backprop was silently broken. Fix: rewrite as `(self - target).pow(2).sum()` using tensor operations.
- **Bug: `requires_grad` hardcoded to `true`** — every tensor tracked gradients, even input data. Wasted computation and caused confusion.
- **Bug: BFS backward traversal** — visited nodes before all upstream gradients accumulated. Broke for any shared tensor (like `x * x`). Fix: reverse topological sort.
- **Bug: bias shape mismatch** — biases were `[1, cols]` but outputs were `[rows, 1]`. A shape mismatch that only surfaced on real MNIST data.
- **Bug: gradient storage never wired up** — backward computed gradients but never actually stored them on the tensors. The engine was computing everything correctly... and throwing it away.
- **"Does backward magically fix the output?"** — Early misconception that calling `.backward()` once would somehow produce the right answer. The realization: backward only *computes* gradients. You still need the loop.
- **"What is learning rate?"** — Understanding it as a step-size scalar. Too big and you overshoot the minimum. Too small and training takes forever.

### Bugs That Taught the Most
- Every bug forced a deeper understanding of either the math or the system design
- The loss-outside-the-graph bug taught what "differentiable" really means in practice
- The BFS-vs-topological-sort bug taught why evaluation order matters when gradients accumulate
- The accuracy measurement bug taught the difference between training signals and evaluation metrics

## Rust-Specific Challenges Worth Mentioning
- **Trait bound explosion**: Impls accumulated bounds like `Clone + Debug + Add<Output=T> + Zero + One + 'static`. Solution: supertrait aliases `ForwardType` and `BackwardType` that bundle everything.
- **Arc + RwLock for the computation graph**: Rust's ownership model doesn't naturally support a DAG where multiple children reference the same parent. `Arc<RwLock<>>` was the escape hatch — shared ownership + interior mutability.
- **PhantomData**: Operation structs like `TensorAdd<T>` are generic over `T` but don't store any `T`. Rust requires `PhantomData<T>` to satisfy the compiler.
- **cdylib vs rlib**: Having only `cdylib` (for PyO3 Python bindings) in `Cargo.toml` prevented the Rust binary from linking the library. Needed both crate types.
- **Macro-generated operator overloading**: 33-line `impl_tensor_op!` macro generates 6 trait impls per invocation for scalar-tensor arithmetic.

## Future Endeavors for the Tensor Library
- Backward passes still `todo!()` for: Div, Neg, ReLU, Tanh, Log, Exp, Sqrt, and more
- GPU support (device enum exists but is a stub)
- Batch processing (currently single-sample only)
- Better Python API (currently minimal — just tensor creation and `.shape()`)
- The code is an absolute mess — but it works, and that matters more at this stage
- View-based operations instead of always cloning data
- Cross-entropy loss (more appropriate for classification than MSE)
- Topological sort improvements

## Here's to Learning New Things, Regardless of Prerequisite Knowledge!
- Two months from "what is a derivative?" to a working neural network in a systems language
- The path wasn't linear — math detours, library rewrites, and debugging sessions were where the real learning happened
- Every bug was a lesson in disguise
- You don't need to know everything before you start — you just need to be willing to go learn what you're missing when you hit a wall

