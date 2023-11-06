# package-arithmetic-js

Arithmetic package for the [Fōrmulæ](https://formulae.org) web application.

Fōrmulæ is a sftware framework for visualization, edition and manipulation of complex expressions, from many fields. The code for an specific field —i.e. arithmetics— is encapsulated in a single unit called a Fōrmulæ **package**.

This repository contains the source code for the **arithmetic package**, in Javascript.

The GitHub organization [formulae-org](https://github.com/formulae-org) encompasses the source code for the rest of packages, as well as the [main web application](https://github.com/formulae-org/formulae-js).

Take a look at this [tutorial](https://formulae.org/?script=tutorials/Arithmetic) to know the capabilities of the Fōrmulæ arithmetic package.

### Capabilities ###

* Types of numbers
    * Integers of arbitrary size
    * Decimal, of arbitrary precision
    * Rational, of arbitrary size for numerator / denominator
* Precision management
    * Based on significant digits
    * It can be set globally or by specific operation
* Rounding
  * Rounding operation
    * Rounding to precision. This mode is used by most operations
    * Rounding to integer. Truncation, floor, ceiling, round
    * Rounding to decimal places
    * Rounding to multiple
  * Rounding modes. They can be set globally or by specific operation
    * Away from zero
    * Towards zero
    * Towards infinity
    * Towards minus infinity
    * To nearest, half away from zero
    * To nearest, half towards zero
    * To nearest, half towards infinity
    * To nearest, half towards minus infinity
    * To nearest, half to even
* "Numeric" operation, forces the operation to be performed with decimal arithmetic. Precision can be specified
* Addition, multiplication, division and exponentiation of integer, decimal and rational numbers with arbitrary precision
* Comparison between integer, decimal and rational numbers, even mixing them.
* Rationalization of decimal values. Rationalization specifying number of repeating digits
* Absolute value, sign, square root, factorial
* Truncation, floor, ceiling and rounding of decimal and rational numbers to integer numbers
* Separation of integer and decimal parts, retrieving the number of decimal places
* List of prime factors of a integer number
* List of digits of a integer number, in any integer positive base
* Greatest common divisor, least common multiple of a list of integer numbers
* Primality of an integer number
* Pseudorandom number generation in uniform distribution
   * In the real interval [0, 1)
   * In a range of integer values
* Testing for a (integer, decimal, rational) to be a real number, a rational number, numeric, an integer, a decimal, positive, zero, negative, even, odd
* Testing if a integer number divides or does nor divide another.
* Conversion between integer, decimal or rational numbers
* Div, Mod and DivMod operations
   * Between integer, decimal and rational number, even mixing them
   * Using any precision
   * Using any roundig mode, or the euclidean mode
* Modular exponentiation, modular multiplicative inverse
* Piecewise definition
* Summation, product
* Trascendental functions, with any precision and rounding mode
  * Decimal logarithm
  * Natural logarithm
  * Binary logarithm
  * Logarithm in specified base
* Trigonometric functions, with any precision and rounding mode
  * Sine, cosine, tangent, cotangent, secant, cosecant
  * Arc sine, arc cosine, arc tangent, arc cotangent, arc secant, arc cosecant
  * atan2
* Hyperbolic functions, with any precision and rounding mode
  * Sine, cosine, tangent, cotangent, secant, cosecant
  * Arc sine, arc cosine, arc tangent, arc cotangent, arc secant, arc cosecant
* Symbolic representation of π and e contants. Numeric conversion with any precision and roundig mode.
