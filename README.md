# package-arithmetic-js

Arithmetic package for the [Fōrmulæ](https://formulae.org) programming language.

Fōrmulæ is also a software framework for visualization, edition and manipulation of complex expressions, from many fields. The code for an specific field —i.e. arithmetics— is encapsulated in a single unit called a Fōrmulæ **package**.

This repository contains the source code for the **arithmetic package**. It is intended to the computation of many arithmetical and mathematical operations.

The GitHub organization [formulae-org](https://github.com/formulae-org) encompasses the source code for the rest of packages, as well as the [web application](https://github.com/formulae-org/formulae-js).

Take a look at this [tutorial](https://formulae.org/?script=tutorials/Arithmetic) to know the capabilities of the Fōrmulæ arithmetic package.

### Capabilities ###

* Types of numbers
    * [Integer numbers](https://en.wikipedia.org/wiki/Integer) of arbitrary size
    * [Decimal numbers](https://en.wikipedia.org/wiki/Real_number), of arbitrary precision
    * [Rational numbers](https://en.wikipedia.org/wiki/Rational_number), of arbitrary size for numerator / denominator
* Precision management
    * Based on [significant digits](https://en.wikipedia.org/wiki/Significant_digit)
    * It can be set globally or by specific operation
* [Rounding](https://en.wikipedia.org/wiki/Rounding)
  * Rounding operation
    * Rounding to precision. This mode is used by most operations
  * Rounding modes. They can be set globally or by specific operation
    * Direct, away from zero
    * Direct, towards zero
    * Direct, towards infinity
    * Direct, towards minus infinity
    * To nearest, half away from zero
    * To nearest, half towards zero
    * To nearest, half towards infinity
    * To nearest, half towards minus infinity
    * To nearest, half to even
* "Numeric" operation, forces the operation to be performed with decimal arithmetic. Precision can be specified
* Basic arithmetic operations: addition, multiplication, division and exponentiation
   * Integer, decimal and rational numbers, even mixing them
   * With any precision and rounding mode
   * Division is visualized as fraction $\frac{a}{b}$
   * Exponentiation is visualized as $a^b$
* Comparison between integer, decimal and rational numbers, even mixing them
  * [Relational operators](https://en.wikipedia.org/wiki/Relational_operator), visualization as $a = b$, $a \ne b$, $a > b$, $a < b$, $a \leq b$, $a \geq b$
  * [Three-way comparison](https://en.wikipedia.org/wiki/Three-way_comparison) operator
* Rationalization of decimal values. Rationalization specifying number of repeating digits
* [Absolute value](https://en.wikipedia.org/wiki/Absolute_value), visualized as $|a|$
* [Sign function](https://en.wikipedia.org/wiki/Sign_function)
* [Square root](https://en.wikipedia.org/wiki/Square_root), visualized as $\sqrt a$
* [Factorial](https://en.wikipedia.org/wiki/Factorial), visualized as $n!$
* Rounding decimal and rational numbers to integers
     * Truncation
     * Floor, visualized as $\lfloor x \rfloor$
     * Ceiling, viuslized as $\lceil x \rceil$
     * Any other rounding mode
* Rounding decimal and rational numbers to decimal with decimal places
* Rounding decimal and rational numbers to multiple values
* Separation of integer and decimal parts, retrieving the number of decimal places
* List of digits of a integer positive number
     * In base 10 by default, but any integer positive number can be specified as the base
     * A size (of list) can be specified. For numbers with less digits, zero values are padded
* [Pseudorandom number](https://en.wikipedia.org/wiki/Pseudorandom_number_generator) generation with uniform distribution
   * In the real interval $\[ 0, 1 \rangle$
   * In a range of integer values
* Testing operation
     * Expression being a real number (integer or decimal)
     * Expression being a rational number
     * Expression being numeric (a integer, decimal or rational number)
     * Expression beig an integer number (an integer, or decimal number with no fractional part)
     * Expression being an integer number
     * Expression being a decimal number
     * Expression beign a positive number, either integer, decimal or rational
     * Expression beign a negative number, either integer, decimal or rational
     * Expression being a zero number, either integer or decimal
     * Expression being an even number (either integer or decimal with no fractional part)
     * Expression being an odd number (either integer or decimal with no fractional part)
     * Whether an integer number [divides](https://en.wikipedia.org/wiki/Divisor#Definition) other, visualization as $a \mid b$
     * Whether an integer number does not [divide](https://en.wikipedia.org/wiki/Divisor#Definition) other, visualization as $a \nmid b$
* Conversion from/to other data types
   * From strings expressing integer or decimal values, in decimal or bases between 2 and 36
* Div, Mod and DivMod operations
   * Between integer, decimal and rational number, even mixing them
   * Using any precision
   * Using any of the 9 roundig modes, or the [euclidean division](https://en.wikipedia.org/wiki/Euclidean_division) mode
* Related to [number theory](https://en.wikipedia.org/wiki/Number_theory)
   * [Primality test](https://en.wikipedia.org/wiki/Primality_test) of a positive integer number
   * List of [prime factors](https://en.wikipedia.org/wiki/Integer_factorization) of a integer number
   * [Greatest common divisor](https://en.wikipedia.org/wiki/Greatest_common_divisor) of a list of integer numbers
   * [Least common multiple](https://en.wikipedia.org/wiki/Least_common_multiple) of a list of integer numbers
   * [Modular exponentiation](https://en.wikipedia.org/wiki/Modular_exponentiation)
   * [Modular multiplicative inverse](https://en.wikipedia.org/wiki/Modular_multiplicative_inverse)
* [Piecewise-defined functions](https://en.wikipedia.org/wiki/Piecewise)
* [Summation of a sequence](https://en.wikipedia.org/wiki/Summation) of a finite number of terms, visually using the [Capital-pi notation](https://en.wikipedia.org/wiki/Iterated_binary_operation#Notation) $\sum$
* [Product of a sequence](https://en.wikipedia.org/wiki/Multiplication#Product_of_a_sequence) of a finite number of terms, visually using the [Capital-sigma notation](https://en.wikipedia.org/wiki/Iterated_binary_operation#Notation) $\prod$
* Numerical calculation of the following [trascendental functions](https://en.wikipedia.org/wiki/Transcendental_function), for a decimal number, with any precision and rounding mode
  * [Common (base 10) logarithm](https://en.wikipedia.org/wiki/Common_logarithm)
  * [Natural logarithm](https://en.wikipedia.org/wiki/Natural_logarithm)
  * [Binary logarithm](https://en.wikipedia.org/wiki/Binary_logarithm)
  * [Logarithm in specific base](https://en.wikipedia.org/wiki/Logarithm)
* Numerical calculation of the following [trigonometric functions](https://en.wikipedia.org/wiki/Trigonometric_functions), for a decimal number, with any precision and rounding mode
  * Sine, cosine, tangent, cotangent, secant, cosecant
  * Arc sine, arc cosine, arc tangent, arc cotangent, arc secant, arc cosecant
  * [2-argument arctangent](https://en.wikipedia.org/wiki/Atan2) (atan2)
* Numerical calculation of the following [hyperbolic functions](https://en.wikipedia.org/wiki/Hyperbolic_functions), for a decimal number, with any precision and rounding mode
  * Sine, cosine, tangent, cotangent, secant, cosecant
  * Arc sine, arc cosine, arc tangent, arc cotangent, arc secant, arc cosecant
* Symbolic representation of π and e contants. Numeric conversion with any precision and roundig mode.
