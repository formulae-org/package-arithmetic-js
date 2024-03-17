/*
Fōrmulæ arithmetic package. Module for reduction.
Copyright (C) 2015-2023 Laurence R. Ugalde

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

'use strict';

export class Arithmetic extends Formulae.ReductionPackage {};

Arithmetic.TAG_NUMBER   = "Math.Number";
Arithmetic.TAG_INFINITY = "Math.Infinity";

///////////////
// precision //
///////////////

Arithmetic.significantDigits = async (significantDigits, session) => {
	if (!significantDigits.children[0].isInternalNumber()) return false;
	
	let canonicalNumber = significantDigits.children[0].get("Value");
	
	if (canonicalNumber instanceof CanonicalArithmetic.Decimal) {
		let d = canonicalNumber.decimal;
		let p = d.isZero() ? 0 : d.precision();
		significantDigits.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(BigInt(p))
			)
		);
		return true;
	}
	else if (canonicalNumber instanceof CanonicalArithmetic.Integer) {
		let bi = canonicalNumber.integer;
		if (bi < 0n) bi = -bi;
		significantDigits.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(
					BigInt(bi.toString().replace(/0+$/, "").length)
				)
			)
		);
		return true;
	}
	
	return false;
};

Arithmetic.setPrecision = async (setPrecision, session) => {
	let precisionExpr = await session.reduceAndGet(setPrecision.children[0], 0);
	let precision = CanonicalArithmetic.getInteger(precisionExpr);
	if (precision === undefined || precision < 1 || precision > 1e+9) {
		ReductionManager.setInError(precisionExpr, "Expression must be a positive integer number");
		throw new ReductionError();
	}
	
	session.Decimal.precision = precision;
	return true;
};

Arithmetic.getPrecision = async (getPrecision, session) => {
	getPrecision.replaceBy(
		CanonicalArithmetic.canonical2InternalNumber(
			new CanonicalArithmetic.Integer(session.Decimal.precision)
		)
	);
	return true;
};

Arithmetic.withPrecision = async (withPrecision, session) => {
	let precisionExpr = await session.reduceAndGet(withPrecision.children[1], 1);
	let precision = CanonicalArithmetic.getInteger(precisionExpr);
	if (precision === undefined || precision < 1 || precision > 1e+9) {
		ReductionManager.setInError(precisionExpr, "Expression must be a positive integer number");
		throw new ReductionError();
	}
	
	// Ok
	let oldPrecision = session.Decimal.precision;
	session.Decimal.set({ precision: precision });
	
	await session.reduce(withPrecision.children[0]);
	
	session.Decimal.set({ precision: oldPrecision });
	
	withPrecision.replaceBy(withPrecision.children[0]);
	return true;
};

////////////////////////////////////////////////
// rounding modes and euclidean division mode //
////////////////////////////////////////////////

Arithmetic.arrayRoundingModes = [
	"Math.Arithmetic.RoundingMode.AwayFromZero",
	"Math.Arithmetic.RoundingMode.TowardsZero",
	"Math.Arithmetic.RoundingMode.TowardsInfinity",
	"Math.Arithmetic.RoundingMode.TowardsMinusInfinity",
	"Math.Arithmetic.RoundingMode.Nearest.HalfAwayFromZero",
	"Math.Arithmetic.RoundingMode.Nearest.HalfTowardsZero",
	"Math.Arithmetic.RoundingMode.Nearest.HalfEven",
	"Math.Arithmetic.RoundingMode.Nearest.HalfTowardsInfinity",
	"Math.Arithmetic.RoundingMode.Nearest.HalfTowardsMinusInfinity",
	"Math.Arithmetic.EuclideanMode"
];

Arithmetic.mapRoundingModes = new Map();
for (let i = 0, n = Arithmetic.arrayRoundingModes.length; i < n; ++i) {
	Arithmetic.mapRoundingModes.set(Arithmetic.arrayRoundingModes[i], i);
};

Arithmetic.setRoundingMode = async (setRoundingMode, session) => {
	let tag = setRoundingMode.children[0].getTag();
	if (!tag.startsWith("Math.Arithmetic.RoundingMode.")) {
		ReductionManager.setInError(
			setRoundingMode.children[0],
			"Expression must be a rounding mode"
		);
		throw new ReductionError();
	}
	
	session.Decimal.rounding = Arithmetic.mapRoundingModes.get(tag);
	return true;
};

Arithmetic.getRoundingMode = async (getRoundingMode, session) => {
	getRoundingMode.replaceBy(
		Formulae.createExpression(
			Arithmetic.arrayRoundingModes[session.Decimal.rounding]
		)
	);
	return true;
};

Arithmetic.setEuclideanDivisionMode = async (setEuclideanDivisionMode, session) => {
	let tag = setEuclideanDivisionMode.children[0].getTag();
	if (!(tag.startsWith("Math.Arithmetic.RoundingMode.") || tag === "Math.Arithmetic.EuclideanMode")) {
		ReductionManager.setInError(
			setEuclideanDivisionMode.children[0],
			"Expression must be a rounding mode or the euclidean mode"
		);
		throw new ReductionError();
	}
	
	session.Decimal.modulo = Arithmetic.mapRoundingModes.get(tag);
	return true;
};

Arithmetic.getEuclideanDivisionMode = async (getEuclideanDivisionMode, session) => {
	getEuclideanDivisionMode.replaceBy(
		Formulae.createExpression(
			Arithmetic.arrayRoundingModes[session.Decimal.modulo]
		)
	);
	return true;
};

///////
// N //
///////

// N(numeric)
Arithmetic.nNumeric = async (n, session) => {
	if (n.children.length != 1) return false; // forward to N(expr, precision)
	
	if (!n.children[0].isInternalNumber()) return false;
	
	let number = n.children[0].get("Value");
	
	if (number instanceof CanonicalArithmetic.Integer) {
		n.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Decimal(
					new Decimal(number.integer.toString(), session)
				)
			)
		);
		
		return true;
	}
	
	if (number instanceof CanonicalArithmetic.Decimal) {
		n.replaceBy(n.children[0]);
		return true;
	}
	
	if (number instanceof CanonicalArithmetic.Rational) {
		n.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Decimal(
					session.Decimal.div(
						number.numerator.toString(),
						number.denominator.toString()
					)
				)
			)
		);
		
		return true;
	}
	
	return false; // forward to other patterns
};

// N(expression, precision)
Arithmetic.nPrecision = async (n, session) => {
	//console.log("N(expression, precision)");
	if (n.children.length < 2) return false; // forward to N(expr)
	
	let precisionExpr = await session.reduceAndGet(n.children[1], 1);
	let precision = CanonicalArithmetic.getInteger(precisionExpr);
	if (precision === undefined || precision < 1 || precision > 1e+9) {
		ReductionManager.setInError(precisionExpr, "Expression must be a positive integer number");
		throw new ReductionError();
	}
	
	// Ok
	n.removeChildAt(1);
	let oldPrecision = session.Decimal.precision;
	session.Decimal.set({ precision: precision });
	
	await session.reduce(n);
	
	session.Decimal.set({ precision: oldPrecision });
	return true;
};

//////////////
// addition //
//////////////

Arithmetic.additionNumeric = async (addition, session) => {
	let pos, n = addition.children.length;
	let canonicalNumber = null;
	
	for (pos = 0; pos < n; ++pos) {
		if (addition.children[pos].isInternalNumber()) {
			canonicalNumber = addition.children[pos].get("Value");
			break;
		}
	}
	
	// there was not any numeric child
	if (pos >= n) return false; // forward to other forms of Addition(...)
	
	// there was, index is (pos)
	let performed = false;
	
	// If pos > 0 change te children to be at first
	
	if (pos > 0) {
		let ne = addition.children[pos];
		addition.removeChildAt(pos);
		addition.addChildAt(0, ne);
	}
	
	// performs addition with other numeric addends
	
	for (let i = n - 1; i > pos; --i) {
		if (addition.children[i].isInternalNumber()) {
			canonicalNumber = canonicalNumber.addition(addition.children[i].get("Value"), session);
			addition.removeChildAt(i);
			performed = true;
		}
	}
	
	if (canonicalNumber.isZero()) {
		switch (addition.children.length) {
			case 1:
				addition.replaceBy(CanonicalArithmetic.canonical2InternalNumber(canonicalNumber));
				return true;
			
			case 2:
				//addition.replaceBy(addition.children[1 - pos]);
				addition.replaceBy(addition.children[1]);
				return true;
			
			default:
				//addition.removeChildAt(pos);
				addition.removeChildAt(0);
				return false;
		}
	}
	
	if (!performed) return false; // forward to other forms of Addition(...)
	
	let internalNumber = CanonicalArithmetic.canonical2InternalNumber(canonicalNumber);
	
	if (addition.children.length == 1) { // just one child
		addition.replaceBy(internalNumber);
		return true;
	}
	else { // more than one child
		//f (pos == 0) {
			addition.setChild(0, internalNumber);
		//}
		//else {
		//	addition.removeChildAt(pos);
		//	addition.addChildAt(0, internalNumber);
		//}
		
		return false;
	}
};

////////////////////
// multiplication //
////////////////////

Arithmetic.multiplicationNumeric = async (multiplication, session) => {
	let pos, n = multiplication.children.length;
	let canonicalNumber = null;
	
	for (pos = 0; pos < n; ++pos) {
		if (multiplication.children[pos].isInternalNumber()) {
			canonicalNumber = multiplication.children[pos].get("Value");
			break;
		}
	}
	
	// there was not any numeric child
	if (pos >= n) return false; // forward to other forms of Multiplication(...)
	
	// there was, index is (pos)
	let performed = false;
	
	// If pos > 0 change te children to be at first
	
	if (pos > 0) {
		let ne = multiplication.children[pos];
		multiplication.removeChildAt(pos);
		multiplication.addChildAt(0, ne);
	}
	
	// performs multiplication with other numeric factors
	
	for (let i = n - 1; i > pos; --i) {
		if (multiplication.children[i].isInternalNumber()) {
			canonicalNumber = canonicalNumber.multiplication(multiplication.children[i].get("Value"), session);
			multiplication.removeChildAt(i);
			performed = true;
		}
	}
	
	// Numeric result was zero
	
	if (canonicalNumber.isZero()) {
		multiplication.replaceBy(CanonicalArithmetic.canonical2InternalNumber(canonicalNumber));
		return true;
	}
	
	// Numeric result was one
	
	if (canonicalNumber.isOne()) {
		switch (multiplication.children.length) {
			case 1:
				multiplication.replaceBy(CanonicalArithmetic.canonical2InternalNumber(canonicalNumber));
				return true;
			
			case 2:
				//multiplication.replaceBy(multiplication.children[1 - pos]);
				multiplication.replaceBy(multiplication.children[1]);
				return true;
			
			default:
				//multiplication.removeChildAt(pos);
				multiplication.removeChildAt(0);
				return true;
		}
	}
	
	if (!performed) return false; // forward to other forms of Multiplication(...)
	
	// numerical result is neither zero nor one
	
	let internalNumber = CanonicalArithmetic.canonical2InternalNumber(canonicalNumber);
	
	if (multiplication.children.length == 1) { // just one child
		multiplication.replaceBy(internalNumber);
		return true;
	}
	else { // more than one child
		//if (pos == 0) {
			multiplication.setChild(0, internalNumber);
		//}
		//else {
		//	multiplication.removeChildAt(pos);
		//	multiplication.addChildAt(0, internalNumber);
		//}
		
		return false;
	}
};

//////////////
// division //
//////////////

// numeric / 0         =>   infinity or -infinity (depends on sign of numerator)
// numeric / numeric   =>   numeric

Arithmetic.divisionNumerics = async (division, session) => {
	let n, d;
	
	if (
		division.children[0].isInternalNumber() &&
		division.children[1].isInternalNumber()
	) {
		let n = division.children[0].get("Value");
		let d = division.children[1].get("Value");
		
		// zero denominator
		if (d.isZero()) {
			let infinity = Formulae.createExpression(Arithmetic.TAG_INFINITY);
			
			// negative numerator
			if (n.isNegative()) {
				let negative = Formulae.createExpression("Math.Arithmetic.Negative");
				negative.addChild(infinity);
				division.replaceBy(negative);
				return true;
			}
			
			division.replaceBy(infinity);
			return true;
		}
		
		let result = n.division(d, session);
		if (result != null) {
			division.replaceBy(CanonicalArithmetic.canonical2InternalNumber(result));
			//session.log("Division between numeric elements");
			//division.setReduced(); // to prevent further reduction
			return true;
		}
	}
	
	return false; // Ok, forward to other forms of Division
};

//////////////
// negative //
//////////////

Arithmetic.negativeNumeric = async (negative, session) => {
	if (negative.children[0].isInternalNumber()) {
		let canonicalNumber = negative.children[0].get("Value");
		
		if (canonicalNumber.isZero()) {
			negative.replaceBy(negative.children[0]);
			return true;
		}
		
		negative.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				canonicalNumber.negate()
			)
		);
		return true;
	}
	
	return false;
};

////////////////////
// exponentiation //
////////////////////

/**
	inputs:
		base:     A Decimal
		exponent: A Decimal
		session:  A session
	output:
		A complex number expression
 */

Arithmetic.complex = (base, exponent, session) => {
	let arg = session.Decimal.atan2(0, base);
	let loh = session.Decimal.ln(base.abs());
	
	let a = session.Decimal.exp(session.Decimal.mul(exponent, loh));
	let b = session.Decimal.mul(exponent, arg);
	
	let complex = Formulae.createExpression("Math.Arithmetic.Addition");
	complex.addChild(
		CanonicalArithmetic.canonical2InternalNumber(
			new CanonicalArithmetic.Decimal(
				session.Decimal.mul(a, session.Decimal.cos(b))
			)
		)
	);
	
	let multiplication = Formulae.createExpression("Math.Arithmetic.Multiplication");
	multiplication.addChild(
		CanonicalArithmetic.canonical2InternalNumber(
			new CanonicalArithmetic.Decimal(
				session.Decimal.mul(a, session.Decimal.sin(b))
			)
		)
	);
	multiplication.addChild(Formulae.createExpression("Math.Complex.Imaginary"));
	
	complex.addChild(multiplication);
	
	return complex;
};

// number ^ number

Arithmetic.exponentiationNumerics = async (exponentiation, session) => {
	let base = exponentiation.children[0].isInternalNumber() ? exponentiation.children[0].get("Value") : null 
	let exponent = exponentiation.children[1].isInternalNumber() ? exponentiation.children[1].get("Value") : null
	 
	if (base === null || exponent === null) return false; // numeric values only
	
	///////////////////
	// special cases //
	///////////////////
	
	if (exponent !== null) {
		if (exponent.isZero()) {
			if (exponent instanceof CanonicalArithmetic.Integer) { // exponent is integer 0
				if (base === null || base instanceof CanonicalArithmetic.Integer) {  // base is not numeric or it is integer
					exponentiation.replaceBy(
						CanonicalArithmetic.canonical2InternalNumber(
							new CanonicalArithmetic.Integer(1n)
						)
					);
				}
				else { // base is decimal
					exponentiation.replaceBy(
						CanonicalArithmetic.canonical2InternalNumber(
							new CanonicalArithmetic.Decimal(1.0, session)
						)
					);
				}
			}
			else { // exponent is 0.0
				if (base.isZero()) {
					exponentiation.replaceBy(Formulae.createExpression(Arithmetic.TAG_INFINITY));
				}
				else { // base is non-zero
					exponentiation.replaceBy(
						CanonicalArithmetic.canonical2InternalNumber(
							new CanonicalArithmetic.Decimal(1, session)
						)
					);
				}
			}
			
			return true;
		}
		
		if (exponent.isOne()) {
			if (
				base     instanceof CanonicalArithmetic.Decimal ||
				exponent instanceof CanonicalArithmetic.Decimal
			) { // 5 ^ 1.0   ->   5.0
				exponentiation.replaceBy(
					CanonicalArithmetic.canonical2InternalNumber(base.toDecimal(session))
				);
			}
			else { // x ^ 1   ->   x
				exponentiation.replaceBy(exponentiation.children[0]);
			}
			
			return true;
		}
	}
	
	if (base !== null) {
		// 0 ^ x   ->   0 or infinity (if x is negative)
		if (base.isZero() && exponent !== null) {
			if (exponent.isNegative()) { // 0 ^ (negative number)   ->   Infinity
				exponentiation.replaceBy(Formulae.createExpression(Arithmetic.TAG_INFINITY));
			}
			else {
				if ( // 0 ^ (positive integer)   ->   0
					base     instanceof CanonicalArithmetic.Integer &&
					exponent instanceof CanonicalArithmetic.Integer
				) {
					exponentiation.replaceBy(
						CanonicalArithmetic.canonical2InternalNumber(
							new CanonicalArithmetic.Integer(0n)
						)
					);
				}
				else {
					exponentiation.replaceBy(
						CanonicalArithmetic.canonical2InternalNumber(
							new CanonicalArithmetic.Decimal(0.0, session)
						)
					);
				}
			}
			
			return true;
		}
		
		if (base.isOne() && exponent !== null) {
			if (base instanceof CanonicalArithmetic.Decimal || exponent instanceof CanonicalArithmetic.Decimal) {
				exponentiation.replaceBy(
					CanonicalArithmetic.canonical2InternalNumber(
						new CanonicalArithmetic.Decimal(1.0, session)
					)
				);
			}
			else {
				exponentiation.replaceBy(
					CanonicalArithmetic.canonical2InternalNumber(
						new CanonicalArithmetic.Integer(1n)
					)
				);
			}
			
			return true;
		}
	}
	
	//////////////////
	// complex case //
	//////////////////
	
	if (base.isNegative()) {
		if (base instanceof CanonicalArithmetic.Integer) {
			if (exponent instanceof CanonicalArithmetic.Decimal) {
				exponentiation.replaceBy(
					Arithmetic.complex(
						new session.Decimal(base.integer.toString()),
						exponent.decimal,
						session
					)
				);
				return true;
			}
		}
		else if (base instanceof CanonicalArithmetic.Decimal) {
			if (exponent instanceof CanonicalArithmetic.Decimal) {
				exponentiation.replaceBy(
					Arithmetic.complex(base.decimal, exponent.decimal, session)
				);
				return true;
			}
			else if (exponent instanceof CanonicalArithmetic.Rational) {
				exponentiation.replaceBy(
					Arithmetic.complex(
						base.decimal,
						session.Decimal.div(
							new session.Decimal(exponent.numerator.toString()),
							new session.Decimal(exponent.denominator.toString())
						),
						session
					)
				);
				return true;
			}
		}
		else { // base is rational
			if (exponent instanceof CanonicalArithmetic.Decimal) {
				exponentiation.replaceBy(
					Arithmetic.complex(
						session.Decimal.div(
							new session.Decimal(base.numerator.toString()),
							new session.Decimal(base.denominator.toString())
						),
						exponent.decimal,
						session
					)
				);
				return true;
			}
		}
	}
	
	///////////////////
	// symbolic case //
	///////////////////
	
	if (exponent instanceof CanonicalArithmetic.Rational) {
		if (base instanceof CanonicalArithmetic.Integer) {
			let b;
			let e = new CanonicalArithmetic.Rational(1n, exponent.denominator);
			if (exponent.isPositive()) {
				b = base.integer ** exponent.numerator;
			}
			else { // exponent is negative
				e = e.negate();
				b = base.integer ** -exponent.numerator;
			}
			
			let expr = Formulae.createExpression("Math.Arithmetic.Exponentiation");
			expr.addChild(CanonicalArithmetic.canonical2InternalNumber(new CanonicalArithmetic.Integer(b)));
			expr.addChild(CanonicalArithmetic.canonical2InternalNumber(e));
			exponentiation.replaceBy(expr);
			return true;
		}
		else if (base instanceof CanonicalArithmetic.Rational) {
			let b;
			let e = new CanonicalArithmetic.Rational(1n, exponent.denominator);
			
			if (exponent.isPositive()) {
				b = new CanonicalArithmetic.Rational(base.numerator ** exponent.numerator , base.denominator ** exponent.numerator);
			}
			else { // exponent is negative
				b = new CanonicalArithmetic.Rational(base.denominator ** -exponent.numerator , base.numerator ** -exponent.numerator);
			}
			b.normalize();
			b.minimize();
			
			let expr = Formulae.createExpression("Math.Arithmetic.Exponentiation");
			expr.addChild(CanonicalArithmetic.canonical2InternalNumber(b));
			expr.addChild(CanonicalArithmetic.canonical2InternalNumber(e));
			exponentiation.replaceBy(expr);
			return true;
		}
	}
	
	exponentiation.replaceBy(
		CanonicalArithmetic.canonical2InternalNumber(
			base.exponentiation(exponent, session)
		)
	);
	return true;
};

Arithmetic.comparisonNumerics = async (comparisonExpression, session) => {
	if (!comparisonExpression.children[0].isInternalNumber() || !comparisonExpression.children[1].isInternalNumber()) {
		return false;
	}
	
	let result = comparisonExpression.children[0].get("Value").comparison(
		comparisonExpression.children[1].get("Value"),
		session
	);
	
	comparisonExpression.replaceBy(Formulae.createExpression(
		result == 0 ?
		"Relation.Comparison.Equals" :
		(
			result < 0 ?
			"Relation.Comparison.Less" :
			"Relation.Comparison.Greater"
		)
	));
	
	return true;
};

Arithmetic.movePointToRight = (session, decimal, n) => {
	return session.Decimal.mul(decimal, session.Decimal.pow(10, n));
};

Arithmetic.decimalToCanonicalRationalOrInteger = (session, decimal) => {
	let decimalPlaces = decimal.decimalPlaces();
	
	if (decimalPlaces === 0) {
		return new CanonicalArithmetic.Integer(BigInt(decimal.toFixed()));
	}
	else {
		let tenPow = session.Decimal.pow(10, decimalPlaces);
		
		let bkpPrecision = session.Decimal.precision;
		session.Decimal.precision = decimal.precision();
		let numerator = session.Decimal.mul(decimal, tenPow);
		session.Decimal.precision = bkpPrecision;
		
		let rational = new CanonicalArithmetic.Rational(
			BigInt(numerator.toFixed()),
			BigInt(tenPow.toFixed())
		);
		rational.minimize(session);
		return rational;
	}
}

Arithmetic.rationalize = async (rationalize, session) => {
	if (!rationalize.children[0].isInternalNumber()) return false;
	let canonicalNumber = rationalize.children[0].get("Value");
	
	if (canonicalNumber instanceof CanonicalArithmetic.Decimal) { // it is decimal
		if (canonicalNumber.decimal.isInteger()) {
			rationalize.replaceBy(
				CanonicalArithmetic.canonical2InternalNumber(
					new CanonicalArithmetic.Integer(
						BigInt(canonicalNumber.decimal.toFixed())
					)
				)
			);
			return true;
		}
		
		if (rationalize.children.length == 1) {
			let tenPow = session.Decimal.pow(10, canonicalNumber.decimal.decimalPlaces());
			
			let bkpPrecision = session.Decimal.precision;
			session.Decimal.precision = canonicalNumber.decimal.precision();
			let numerator = session.Decimal.mul(canonicalNumber.decimal, tenPow);
			session.Decimal.precision = bkpPrecision;
			
			let rational = new CanonicalArithmetic.Rational(
				BigInt(numerator.toFixed()),
				BigInt(tenPow.toFixed())
			);
			rational.normalize();
			rational.minimize();
			rationalize.replaceBy(
				CanonicalArithmetic.canonical2InternalNumber(rational)
			);
		}
		else {
			let repeating = CanonicalArithmetic.getInteger(rationalize.children[1]);
			if (repeating === undefined || repeating < 1) return false;
			
			let places = canonicalNumber.decimal.decimalPlaces();
			let offset = places - repeating;
			
			let bkpPrecision = session.Decimal.precision;
			session.Decimal.precision = canonicalNumber.decimal.precision();
			
			canonicalNumber.decimal = Arithmetic.movePointToRight(session, canonicalNumber.decimal, offset);
			let integralPart = canonicalNumber.decimal.floor();
			let fractionalPart = Arithmetic.movePointToRight(session, Decimal.sub(canonicalNumber.decimal, integralPart), repeating);
			let divisor1 = Arithmetic.movePointToRight(session, 1, offset);
			let divisor2 = Arithmetic.movePointToRight(session, session.Decimal.sub(Arithmetic.movePointToRight(session, 1, repeating), 1), offset);
			
			session.Decimal.precision = bkpPrecision;
			
			let rational1 = new CanonicalArithmetic.Rational(BigInt(integralPart.toFixed()),   BigInt(divisor1.toFixed()));
			let rational2 = new CanonicalArithmetic.Rational(BigInt(fractionalPart.toFixed()), BigInt(divisor2.toFixed()));
			
			let canonicalResult = rational1.addition(rational2, session);
			rationalize.replaceBy(
				CanonicalArithmetic.canonical2InternalNumber(canonicalResult)
			);
		}
		
		return true;
	}
	else { // integer or rational
		rationalize.replaceBy(rationalize.children[0]);
		return true;
	}
};

Arithmetic.absNumeric = async (abs, session) => {
	if (!abs.children[0].isInternalNumber()) return false;
	let numeric = abs.children[0].get("Value");
	
	if (numeric.isNegative()) {
		abs.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(numeric.negate())
		);
	}
	else {
		abs.replaceBy(abs.children[0]);
	}
	
	return true;
};

Arithmetic.signNumeric = async (sign, session) => {
	if (!sign.children[0].isInternalNumber()) return false;
	let numeric = sign.children[0].get("Value");
	
	sign.replaceBy(
		CanonicalArithmetic.canonical2InternalNumber(
			new CanonicalArithmetic.Integer(
				numeric.isZero() ? 0n : (numeric.isNegative() ? -1n : 1n)
			)
		)
	);
	
	return true;
};

//////////////
// Rounding //
//////////////

Arithmetic.roundToPrecision = async (roundToPrecision, session) => {
	if (!roundToPrecision.children[0].isInternalNumber()) return false;
	let canonical = roundToPrecision.children[0].get("Value");
	
	let precision = CanonicalArithmetic.getInteger(roundToPrecision.children[1]);
	if (precision === undefined || precision <= 0n) return false;
	
	let rm = session.Decimal.rounding;
	if (roundToPrecision.children.length >= 3) {
		let tag = roundToPrecision.children[2].getTag();
		if (!tag.startsWith("Math.Arithmetic.RoundingMode.")) return false;
		rm = Arithmetic.mapRoundingModes.get(tag);
	}
	
	if (canonical instanceof CanonicalArithmetic.Integer) {
		let decimal = (new session.Decimal(canonical.integer.toString())).toSignificantDigits(precision, rm);
		roundToPrecision.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(
					BigInt(decimal.toFixed())
				)
			)
		);
	}
	else if (canonical instanceof CanonicalArithmetic.Decimal) {
		roundToPrecision.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Decimal(
					canonical.decimal.toSignificantDigits(precision, rm)
				)
			)
		);
	}
	else { // rational
		let n = new session.Decimal(canonical.numerator.toString());
		let d = new session.Decimal(canonical.denominator.toString());
		
		let oldPrecision = session.Decimal.precision;
		let oldRounding  = session.Decimal.rounding;
		
		session.Decimal.set({ precision: precision, rounding: rm });
		let r = session.Decimal.div(n, d)
		session.Decimal.set({ precision: oldPrecision, rounding: oldRounding });
		
		roundToPrecision.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Decimal(r)
			)
		)
	}
	
	return true;
};

Arithmetic.roundToInteger = async (roundToInteger, session) => {
	if (!roundToInteger.children[0].isInternalNumber()) return false;
	let canonical = roundToInteger.children[0].get("Value");
	
	let rm = session.Decimal.rounding;
	if (roundToInteger.children.length >= 2) {
		let tag = roundToInteger.children[1].getTag();
		if (!tag.startsWith("Math.Arithmetic.RoundingMode.")) return false;
		rm = Arithmetic.mapRoundingModes.get(tag);
	}
	
	if (canonical instanceof CanonicalArithmetic.Integer) {
		roundToInteger.replaceBy(roundToInteger.children[0]);
	}
	else if (canonical instanceof CanonicalArithmetic.Decimal) {
		let oldRounding  = session.Decimal.rounding;
		
		session.Decimal.set({ rounding: rm });
		let r = session.Decimal.round(canonical.decimal);
		session.Decimal.set({ rounding: oldRounding });
		
		roundToInteger.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(BigInt(r.toFixed()))
			)
		);
	}
	else { // rational
		let oldRounding  = session.Decimal.rounding;
		session.Decimal.set({ rounding: rm });
		let i = CanonicalArithmetic.integerDivision(canonical.numerator, canonical.denominator, session);
		session.Decimal.set({ rounding: oldRounding });
		
		roundToInteger.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(i)
			)
		);
	}
	
	return true;
};

Arithmetic.roundToDecimalPlaces = async (roundToDecimalPlaces, session) => {
	if (!roundToDecimalPlaces.children[0].isInternalNumber()) return false;
	let canonicalValue = roundToDecimalPlaces.children[0].get("Value");
	
	let place = CanonicalArithmetic.getBigInt(roundToDecimalPlaces.children[1]);
	if (place === undefined) return false;
	
	let rm = session.Decimal.rounding;
	if (roundToDecimalPlaces.children.length >= 3) {
		let tag = roundToDecimalPlaces.children[2].getTag();
		if (!tag.startsWith("Math.Arithmetic.RoundingMode.")) return false;
		rm = Arithmetic.mapRoundingModes.get(tag);
	}
	
	let canonicalMultiple;
	if (place >= 0n) {
		canonicalMultiple = new CanonicalArithmetic.Rational(1n, 10n ** place);
	}
	else {
		canonicalMultiple = new CanonicalArithmetic.Integer(10n ** -place);
	}
	
	let oldRounding  = session.Decimal.rounding;
	session.Decimal.set({ rounding: rm });
	
	let div =canonicalValue.divMod(canonicalMultiple, true, false, session)[0];
	if (canonicalValue instanceof CanonicalArithmetic.Decimal) {
		div = new CanonicalArithmetic.Decimal(div.integer.toString(), session);
	} 
	let r = div.multiplication(canonicalMultiple, session);
	session.Decimal.set({ rounding: oldRounding });
	
	roundToDecimalPlaces.replaceBy(
		CanonicalArithmetic.canonical2InternalNumber(r)
	);
	
	return true;
};

Arithmetic.roundToMultiple = async (roundToMultiple, session) => {
	if (!roundToMultiple.children[0].isInternalNumber()) return false;
	let canonicalValue = roundToMultiple.children[0].get("Value");
	
	if (!roundToMultiple.children[1].isInternalNumber()) return false;
	let canonicalMultiple = roundToMultiple.children[1].get("Value");
	
	let rm = session.Decimal.rounding;
	if (roundToMultiple.children.length >= 3) {
		let tag = roundToMultiple.children[2].getTag();
		if (!tag.startsWith("Math.Arithmetic.RoundingMode.")) return false;
		rm = Arithmetic.mapRoundingModes.get(tag);
	}
	
	let oldRounding  = session.Decimal.rounding;
	session.Decimal.set({ rounding: rm });
	let r = canonicalValue.divMod(canonicalMultiple, true, false, session)[0].multiplication(canonicalMultiple, session);
	session.Decimal.set({ rounding: oldRounding });
	
	roundToMultiple.replaceBy(
		CanonicalArithmetic.canonical2InternalNumber(r)
	);
	
	return true;
};

Arithmetic.floorCeilingRoundTruncate = async (fcrt, session) => {
	if (!fcrt.children[0].isInternalNumber()) return false;
	let numeric = fcrt.children[0].get("Value");
	
	let places = 0;
	
	if (fcrt.children.length >= 2) { // there is scale
		if ((places = CanonicalArithmetic.getInteger(fcrt.children[1])) == null) {
			ReductionManager.setInError(fcrt.children[1], "Expression must be an integer number");
			throw new ReductionError();
		}
	}
	
	if (places < 0) {
		// currently the Decimal.js library does not support the division operation
		// giving the number of decimal places instead of the precision
		// decimal = session.Decimal.div(numeric.n, numeric.d, Arithmetic.mapRoundingModes2.get(fcrt.getTag()));
		return false;
	}
	
	let roundingMode;
	switch (fcrt.getTag()) {
		case "Math.Arithmetic.Truncate": roundingMode = 1; break;
		case "Math.Arithmetic.Ceiling" : roundingMode = 2; break;
		case "Math.Arithmetic.Floor"   : roundingMode = 3; break;
		case "Math.Arithmetic.Round"   : roundingMode = 5; break;
	}
	
	let decimal;
	if (numeric instanceof CanonicalArithmetic.Decimal) {
		decimal = numeric.decimal;
	}
	else if (numeric instanceof CanonicalArithmetic.Integer) {
		decimal = new session.Decimal(numeric.integer.toString());
	}
	else { // rational
		let roundingModeBkp = session.Decimal.rounding;
		session.Decimal.rounding = roundingMode;
		let q = CanonicalArithmetic.integerDivision(numeric.numerator, numeric.denominator, session);
		session.Decimal.rounding = roundingModeBkp;
		
		decimal = new session.Decimal(q.toString());
	}
	
	
	//switch (fcrt.getTag()) {
	//	case "Math.Arithmetic.Truncate": decimal = decimal.toDecimalPlaces(places, 1); break;
	//	case "Math.Arithmetic.Ceiling" : decimal = decimal.toDecimalPlaces(places, 2); break;
	//	case "Math.Arithmetic.Floor"   : decimal = decimal.toDecimalPlaces(places, 3); break;
	//	case "Math.Arithmetic.Round"   : decimal = decimal.toDecimalPlaces(places, 5); break;
	//}
	decimal = decimal.toDecimalPlaces(places, roundingMode);
	
	if (places <= 0) {
		fcrt.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(BigInt(decimal.toFixed()))
			)
		);
	}
	else {
		fcrt.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Decimal(decimal)
			)
		);
	}
	
	return true;
};

Arithmetic.divMod = async (divMod, session) => {
	if (!divMod.children[0].isInternalNumber()) return false;
	let dividend = divMod.children[0].get("Value");
	
	if (!divMod.children[1].isInternalNumber()) return false;
	let divisor = divMod.children[1].get("Value");
	
	if (divisor.isZero()) {
		divMod.replaceBy(Formulae.createExpression("Math.Infinity"));
		return true;
	}
	
	let tag = divMod.getTag();
	
	let isDiv = tag.includes("Div");
	let isMod = tag.includes("Mod");
	
	let dm = dividend.divMod(divisor, isDiv, isMod, session);
	
	let result;
	
	if (isDiv && isMod) {
		result = Formulae.createExpression("List.List");
		result.addChild(
			CanonicalArithmetic.canonical2InternalNumber(dm[0])
		);
		result.addChild(
			CanonicalArithmetic.canonical2InternalNumber(dm[1])
		);
	}
	else {
		result = CanonicalArithmetic.canonical2InternalNumber(dm[isDiv ? 0: 1])
	}
	
	divMod.replaceBy(result);
	return true;
};

Arithmetic.modPow = async (modPow, session) => {
	if (
		!modPow.children[0].isInternalNumber() ||
		!modPow.children[1].isInternalNumber() ||
		!modPow.children[2].isInternalNumber()
	) {
		return false;
	}
	
	let b = modPow.children[0].get("Value");
	if (!(b instanceof CanonicalArithmetic.Integer) || b.integer < 0n) {
		ReductionManager.setInError(modPow.children[0], "Base must be an integer, non-negative number");
		throw new ReductionError();
	}
	
	let e = modPow.children[1].get("Value");
	if (!(e instanceof CanonicalArithmetic.Integer) || e.integer < 0n) {
		ReductionManager.setInError(modPow.children[1], "Exponent must be an integer, non-negative number");
		throw new ReductionError();
	}
	
	let m = modPow.children[2].get("Value");
	if (!(m instanceof CanonicalArithmetic.Integer) || m.integer < 0n) {
		ReductionManager.setInError(modPow.children[2], "Modulo must be an integer, non-negative number");
		throw new ReductionError();
	}
	
	b = b.integer;
	e = e.integer;
	m = m.integer;
	
	let r;
	
	if (m == 1n) {
		r = 0n;
	}
	else {
		r = 1n;
		b = b % m;
		while (e > 0n) {
			if ((e % 2n) == 1n) {
				r = (r * b) % m;
			}
			
			b = (b * b) % m;
			e = e / 2n;
		}
	}
	
	modPow.replaceBy(
		CanonicalArithmetic.canonical2InternalNumber(
			new CanonicalArithmetic.Integer(r)
		)
	);
	
	return true;
};

Arithmetic.modInverse = async (modInverse, session) => {
	if (
		!modInverse.children[0].isInternalNumber() ||
		!modInverse.children[1].isInternalNumber()
	) {
		return false;
	}
	
	let a = modInverse.children[0].get("Value");
	if (!(a instanceof CanonicalArithmetic.Integer) || a.integer < 0n) {
		ReductionManager.setInError(modInverse.children[0], "Expression must be an non-negative integer");
		throw new ReductionError();
	}
	
	let m = modInverse.children[1].get("Value");
	if (!(m instanceof CanonicalArithmetic.Integer) || m.integer < 0n) {
		ReductionManager.setInError(modInverse.children[1], "Modulo must be an integer, non-negative number");
		throw new ReductionError();
	}
	
	 a = a.integer;
	 m = m.integer;
	
	let t = 0n, newt = 1n;
	let r = m,  newr = a;
	let quotient;
	let tmp;
	
	while (newr != 0n) {
		quotient = r / newr;
		tmp = newt; newt = t - (quotient * newt); t = tmp;
		tmp = newr; newr = r - (quotient * newr); r = tmp;
	}
	
	if (r > 1n) {
		ReductionManager.setInError(modInverse.children[0], "Number is not invertible in such that base");
		throw new ReductionError();
	}
	
	if (t < 0n) {
		t = t + m;
	}
	
	modInverse.replaceBy(
		CanonicalArithmetic.canonical2InternalNumber(
			new CanonicalArithmetic.Integer(t)
		)
	);
	
	return true;
};

Arithmetic.mapLogs = new Map();
Arithmetic.mapLogs.set("Math.Transcendental.NaturalLogarithm", null);
Arithmetic.mapLogs.set("Math.Transcendental.DecimalLogarithm", 10);
Arithmetic.mapLogs.set("Math.Transcendental.BinaryLogarithm",  2);

Arithmetic.log = async (log, session) => {
	if (!log.children[0].isInternalNumber()) return false;
	let x = log.children[0].get("Value");
	if (!(x instanceof CanonicalArithmetic.Decimal)) return false; // forward to other forms of log()
	x = x.decimal;
	
	let base = null;
	
	if (log.children.length === 1) {
		let b = Arithmetic.mapLogs.get(log.getTag());
		if (b !== null)  {
			base = new session.Decimal(b);
		}
	}
	else { // base is provided
		if (!log.children[1].isInternalNumber()) return false;
		let n = log.children[1].get("Value");
		if (n instanceof CanonicalArithmetic.Integer) {
			base = new session.Decimal(n.toString());
		}
		else {
			base = n.decimal;
		}
		
		if (base.lessThanOrEqualTo(0)) {
			ReductionManager.setInError(log.children[1], "Invalid base");
			throw new ReductionError();
		}
	}
	
	if (x.greaterThan(0)) { // positive argument
		log.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Decimal(
					base === null ?
					session.Decimal.ln(x) :
					session.Decimal.log(x, base)
				)
			)
		);
	}
	else if (x.lessThan(0)) { // negative argument
		let realPart =
			base === null ?
			session.Decimal.ln(x.abs()) :
			session.Decimal.log(x.abs(), base)
		;
		let imaginaryPart = session.Decimal.atan2(0, x);
		if (base !== null) {
			imaginaryPart = session.Decimal.div(imaginaryPart, session.Decimal.ln(base));
		}
		
		let mult = Formulae.createExpression("Math.Arithmetic.Multiplication");
		mult.addChild(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Decimal(imaginaryPart)
			)
		);
		mult.addChild(Formulae.createExpression("Math.Complex.Imaginary"));
		let addition = Formulae.createExpression("Math.Arithmetic.Addition");
		addition.addChild(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Decimal(realPart)
			)
		);
		addition.addChild(mult);
		
		log.replaceBy(addition);
	}
	else { // x = 0
		if (base.greaterThan(1)) {
			let negative = Formulae.createExpression("Math.Arithmetic.Negative");
			negative.addChild(Formulae.createExpression("Math.Infinity"));
			log.replaceBy(negative);
		}
		else {
			let infinity = Formulae.createExpression("Math.Infinity");
			log.replaceBy(infinity);
		}
	}
	
	return true;
};

Arithmetic.sqrt = async (sqrt, session) => {
	let arg = sqrt.children[0];
	if (!arg.isInternalNumber()) return false;
	let numeric = arg.get("Value");
	
	///////////////////////
	// negative argument //
	///////////////////////
	let negative;
	if (negative = numeric.isNegative()) {
		numeric = numeric.negate();
	}

	let expr;
		
	if (numeric instanceof CanonicalArithmetic.Decimal) {
		expr = CanonicalArithmetic.canonical2InternalNumber(
			new CanonicalArithmetic.Decimal(
				session.Decimal.sqrt(numeric.decimal)
			)
		)
	}
	else if (numeric instanceof CanonicalArithmetic.Integer) {
		let r = session.Decimal.sqrt(numeric.integer.toString());
		if (r.isInteger()) {
			expr = CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(BigInt(r.toString()))
			);
		}
		else {
			if (negative) {
				expr = Formulae.createExpression("Math.Arithmetic.SquareRoot");
				expr.addChild(
					CanonicalArithmetic.canonical2InternalNumber(numeric)
				);
			}
			else {
				return true;
			}
		}
	}
	else { // rational
		let n = session.Decimal.sqrt(numeric.numerator.toString());
		let d = session.Decimal.sqrt(numeric.denominator.toString());
		let ni = n.isInteger();
		let di = d.isInteger();
		if (ni && di) {
			let rational = new CanonicalArithmetic.Rational(
				BigInt(n.toFixed()),
				BigInt(d.toFixed())
			);
			rational.normalize();
			rational.minimize();
			expr = CanonicalArithmetic.canonical2InternalNumber(rational);
		}
		else if (ni !== di) {
			let N, D;
			
			if (ni) {
				N = CanonicalArithmetic.canonical2InternalNumber(
					new CanonicalArithmetic.Integer(BigInt(n.toString()))
				);
			}
			else {
				N = Formulae.createExpression("Math.Arithmetic.SquareRoot");
				N.addChild(
					CanonicalArithmetic.canonical2InternalNumber(
						new CanonicalArithmetic.Integer(numeric.numerator)
					)
				);
			}
			
			if (di) {
				D = CanonicalArithmetic.canonical2InternalNumber(
					new CanonicalArithmetic.Integer(BigInt(d.toString()))
				);
			}
			else {
				D = Formulae.createExpression("Math.Arithmetic.SquareRoot");
				D.addChild(
					CanonicalArithmetic.canonical2InternalNumber(
						new CanonicalArithmetic.Integer(numeric.denominator)
					)
				);
			}
			
			expr = Formulae.createExpression("Math.Arithmetic.Division");
			expr.addChild(N);
			expr.addChild(D);
		}
		else {
			if (!negative) {
				return true;
			}
			
			expr = Formulae.createExpression("Math.Arithmetic.SquareRoot");
			expr.addChild(
				CanonicalArithmetic.canonical2InternalNumber(numeric)
			);
		}
	}
	
	if (negative) {
		let mult = Formulae.createExpression("Math.Arithmetic.Multiplication");
		mult.addChild(expr);
		mult.addChild(Formulae.createExpression("Math.Complex.Imaginary"));
		expr = mult;
	}
	
	sqrt.replaceBy(expr);
	return true;
};

Arithmetic.trigHyper = async (f, session) => {
	let arg = f.children[0];
	
	if (!arg.isInternalNumber()) return false;
	let number = arg.get("Value");
	
	//////////////////
	// integer zero //
	//////////////////
	
	integer: if (number instanceof CanonicalArithmetic.Integer) {
		let n = CanonicalArithmetic.getInteger(arg)
		
		if (n === 0) {
			let expr;
			
			switch (f.getTag()) {
				case "Math.Trigonometric.Sine":
				case "Math.Trigonometric.Tangent":
				case "Math.Trigonometric.ArcSine":
				case "Math.Trigonometric.ArcTangent":
				case "Math.Hyperbolic.Sine":
				case "Math.Hyperbolic.Tangent":
				case "Math.Hyperbolic.ArcSine":
				case "Math.Hyperbolic.ArcTangent":
					expr = CanonicalArithmetic.number2InternalNumber(0);
					break;
				
				case "Math.Trigonometric.Cosine":
				case "Math.Trigonometric.Secant":
				case "Math.Hyperbolic.Cosine":
				case "Math.Hyperbolic.Secant":
					expr = CanonicalArithmetic.number2InternalNumber(1);
					break;
				
				case "Math.Trigonometric.Cotangent":
				case "Math.Trigonometric.Cosecant":
				case "Math.Trigonometric.ArcCotangent":
				case "Math.Trigonometric.ArcCosecant":
				case "Math.Hyperbolic.Cotangent":
				case "Math.Hyperbolic.Cosecant":
				case "Math.Hyperbolic.ArcCosine":
				case "Math.Hyperbolic.ArcCotangent":
				case "Math.Hyperbolic.ArcSecant":
				case "Math.Hyperbolic.ArcCosecant":
					expr = Formulae.createExpression("Math.Infinity");
					break;
				
				default:
					break integer;
			}
			
			f.replaceBy(expr);
			return true;
		}
		
		if (n === 1) {
			let expr;
			
			switch (f.getTag()) {
				case "Math.Trigonometric.ArcCosine":
				case "Math.Hyperbolic.ArcCosine":
				case "Math.Hyperbolic.ArcCotangent":
					expr = CanonicalArithmetic.number2InternalNumber(0);
					break;
				
				case "Math.Trigonometric.ArcSecant":
				case "Math.Hyperbolic.ArcTangent":
				case "Math.Hyperbolic.ArcSecant":
					expr = Formulae.createExpression("Math.Infinity");
					break;
				
				default:
					break integer;
			}
			
			f.replaceBy(expr);
			return true;
		}
		
		if (n === -1) {
			let expr;
			
			switch (f.getTag()) {
				case "Math.Hyperbolic.ArcCotangent":
					expr = CanonicalArithmetic.number2InternalNumber(0);
					break;
				
				case "Math.Hyperbolic.ArcCosine":
				case "Math.Hyperbolic.ArcSecant":
					expr = Formulae.createExpression("Math.Infinity");
					break;
				
				case "Math.Hyperbolic.ArcTangent":
					expr = Formulae.createExpression(
							"Math.Arithmetic.Negative",
							Formulae.createExpression(
								"Math.Infinity"
							)
						)
					;
					break;
				
				default:
					break integer;
			}
			
			f.replaceBy(expr);
			return true;
		}
	}
	
	//////////////////////
	// A decimal number //
	//////////////////////
	
	if (!(number instanceof CanonicalArithmetic.Decimal)) return false;   // to forward to another forms
	
	let result;
	switch (f.getTag()) {
		case "Math.Trigonometric.Sine":
			result = session.Decimal.sin(number.decimal);
			break;
		
		case "Math.Trigonometric.Cosine":
			result = session.Decimal.cos(number.decimal);
			break;
		
		case "Math.Trigonometric.Tangent":
			result = session.Decimal.tan(number.decimal);
			break;
			
		case "Math.Trigonometric.Cotangent":
			result = session.Decimal.div(1, session.Decimal.tan(number.decimal));
			break;
			
		case "Math.Trigonometric.Secant":
			result = session.Decimal.div(1, session.Decimal.cos(number.decimal));
			break;
		
		case "Math.Trigonometric.Cosecant":
			result = session.Decimal.div(1, session.Decimal.sin(number.decimal));
			break;
			
		case "Math.Trigonometric.ArcSine":
			result = session.Decimal.asin(number.decimal);
			break;
		
		case "Math.Trigonometric.ArcCosine":
			result = session.Decimal.acos(number.decimal);
			break;
		
		case "Math.Trigonometric.ArcTangent":
			result = session.Decimal.atan(number.decimal);
			break;
			
		case "Math.Trigonometric.ArcCotangent":
			result = session.Decimal.div(1, session.Decimal.atan(number.decimal));
			break;
			
		case "Math.Trigonometric.ArcSecant":
			result = session.Decimal.div(1, session.Decimal.acos(number.decimal));
			break;
		
		case "Math.Trigonometric.ArcCosecant":
			result = session.Decimal.div(1, session.Decimal.asin(number.decimal));
			break;
			
		case "Math.Hyperbolic.Sine":
			result = session.Decimal.sinh(number.decimal);
			break;
		
		case "Math.Hyperbolic.Cosine":
			result = session.Decimal.cosh(number.decimal);
			break;
		
		case "Math.Hyperbolic.Tangent":
			result = session.Decimal.tanh(number.decimal);
			break;
			
		case "Math.Hyperbolic.Cotangent":
			result = session.Decimal.div(1, session.Decimal.tanh(number.decimal));
			break;
			
		case "Math.Hyperbolic.Secant":
			result = session.Decimal.div(1, session.Decimal.cosh(number.decimal));
			break;
		
		case "Math.Hyperbolic.Cosecant":
			result = session.Decimal.div(1, session.Decimal.sinh(number.decimal));
			break;
			
		case "Math.Hyperbolic.ArcSine":
			result = session.Decimal.asinh(number.decimal);
			break;
		
		case "Math.Hyperbolic.ArcCosine":
			result = session.Decimal.acosh(number.decimal);
			break;
		
		case "Math.Hyperbolic.ArcTangent":
			result = session.Decimal.atanh(number.decimal);
			break;
			
		case "Math.Hyperbolic.ArcCotangent":
			result = session.Decimal.div(1, session.Decimal.atanh(number.decimal));
			break;
			
		case "Math.Hyperbolic.ArcSecant":
			result = session.Decimal.div(1, session.Decimal.acosh(number.decimal));
			break;
		
		case "Math.Hyperbolic.ArcCosecant":
			result = session.Decimal.div(1, session.Decimal.asinh(number.decimal));
			break;
	}
	
	if (result.isFinite()) {
		f.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Decimal(result)
			)
		);
	}
	else {
		if (result.isNegative()) {
			let negative = Formulae.createExpression("Math.Arithmetic.Negative");
			negative.addChild(Formulae.createExpression("Math.Infinity"));
			f.replaceBy(negative);
		}
		else {
			let infinity = Formulae.createExpression("Math.Infinity");
			f.replaceBy(infinity);
		}
	}
	
	return true;
};

Arithmetic.atan2 = async (atan2, session) => {
	if (!atan2.children[0].isInternalNumber()) return false;
	let numbery = atan2.children[0].get("Value");
	
	if (!atan2.children[1].isInternalNumber()) return false;
	let numberx = atan2.children[1].get("Value");
	
	if (numbery.isZero()) {
		if (numberx.isPositive()) {
			atan2.replaceBy(
				CanonicalArithmetic.number2InternalNumber(0)
			);
		}
		else if (numberx.isNegative()) {
			atan2.replaceBy(
				Formulae.createExpression("Math.Constant.Pi")
			);
		}
		else { // zero
			atan2.replaceBy(
				Formulae.createExpression("Math.Infinity")
			);
		}
		
		return true;
	}
	
	if (numberx.isZero()) {
		if (numbery.isPositive()) {
			atan2.replaceBy(
				Formulae.createExpression(
					"Math.Arithmetic.Multiplication",
					CanonicalArithmetic.canonical2InternalNumber(
						new CanonicalArithmetic.Rational(1n, 2n)
					),
					Formulae.createExpression("Math.Constant.Pi")
				)
			);
		}
		else { // negative
			atan2.replaceBy(
				Formulae.createExpression(
					"Math.Arithmetic.Multiplication",
					CanonicalArithmetic.canonical2InternalNumber(
						new CanonicalArithmetic.Rational(-1n, 2n)
					),
					Formulae.createExpression("Math.Constant.Pi")
				)
			);
		}
		
		return true;
	}
	
	if (!(numberx instanceof CanonicalArithmetic.Decimal || numbery instanceof CanonicalArithmetic.Decimal)) {
		return false;
	}
	
	if (numberx instanceof CanonicalArithmetic.Decimal) {
		numberx = numberx.decimal;
	}
	else if (numberx instanceof CanonicalArithmetic.Integer) {
		numberx = new session.Decimal(numberx.integer.toString());
	}
	else { // rational
		numberx = new session.Decimal.div(
			numberx.numerator.toString(),
			numberx.denominator.toString()
		)
	}
	
	if (numbery instanceof CanonicalArithmetic.Decimal) {
		numbery = numbery.decimal;
	}
	else if (numbery instanceof CanonicalArithmetic.Integer) {
		numbery = new session.Decimal(numbery.integer.toString());
	}
	else { // rational
		numbery = new session.Decimal.div(
			numbery.numerator.toString(),
			numbery.denominator.toString()
		)
	}
	
	atan2.replaceBy(
		CanonicalArithmetic.canonical2InternalNumber(
			new CanonicalArithmetic.Decimal(
				session.Decimal.atan2(numbery, numberx)
			)
		)
	);
	
	return true;
};

Arithmetic.integerPart = async (f, session) => {
	if (!f.children[0].isInternalNumber()) return false;
	let numeric = f.children[0].get("Value");
	
	if (numeric instanceof CanonicalArithmetic.Decimal) {
		f.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(
					BigInt(numeric.decimal.abs().truncated().toFixed())
				)
			)
		);
	}
	else if (numeric instanceof CanonicalArithmetic.Integer) {
		f.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(
					numeric.integer < 0n ? -numeric.integer : numeric.integer
				)
			)
		);
	}
	else { // rational
		f.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(
					(numeric.numerator < 0n ? -numeric.numerator : numeric.numerator) / numeric.denominator
				)
			)
		);
	}
	
	return true;
};

Arithmetic.fractionalPart = async (f, session) => {
	if (!f.children[0].isInternalNumber()) return false;
	let numeric = f.children[0].get("Value");
	
	if (numeric instanceof CanonicalArithmetic.Decimal) {
		let x = numeric.decimal.abs();
		
		f.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Decimal(
					session.Decimal.sub(x, x.truncated())
				)
			)
		);
	}
	else if (numeric instanceof CanonicalArithmetic.Integer) {
		f.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Decimal(
					new session.Decimal(0.0)
				)
			)
		);
	}
	else { // rational
		f.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Rational(
					(numeric.numerator < 0n ? -numeric.numerator : numeric.numerator) % numeric.denominator,
					numeric.denominator
				)
			)
		);
	} 
	
	return true;
};

Arithmetic.decimalPlaces = async (f, session) => {
	if (!f.children[0].isInternalNumber()) return false;
	let numeric = f.children[0].get("Value");
	
	if (numeric instanceof CanonicalArithmetic.Decimal) {
		f.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(
					BigInt(numeric.decimal.decimalPlaces())
				)
			)
		);
		return true;
	}
	else if (numeric instanceof CanonicalArithmetic.Integer) {
		f.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(0n)
			)
		);
		return true;
	}
	
	return false;
};

Arithmetic.isX = async (is, session) => {
	if (!is.children[0].isInternalNumber()) return false;
	let numeric = is.children[0].get("Value");
	
	let result;
	
	switch (is.getTag()) {
		case "Math.Arithmetic.IsRealNumber":
			result = !(numeric instanceof CanonicalArithmetic.Rational);
			break;
			
		case "Math.Arithmetic.IsRationalNumber":
			result = numeric instanceof CanonicalArithmetic.Rational;
			break;
			
		case "Math.Arithmetic.IsNumeric":
			result = true;
			break;
			
		case "Math.Arithmetic.IsIntegerValue":
			result =
				numeric instanceof CanonicalArithmetic.Integer ||
				numeric instanceof CanonicalArithmetic.Decimal && numeric.decimal.isInteger()
			;
			break;
			
		case "Math.Arithmetic.IsInteger":
			result = numeric instanceof CanonicalArithmetic.Integer;
			break;
			
		case "Math.Arithmetic.IsDecimal":
			result = numeric instanceof CanonicalArithmetic.Decimal;
			break;
			
		case "Math.Arithmetic.IsNegativeNumber":
			result = numeric.isNegative();
			break;
			
		case "Math.Arithmetic.IsPositiveNumber":
			result = numeric.isPositive();
			break;
			
		case "Math.Arithmetic.IsNumberZero":
			result = numeric.isZero();
			break;
			
		case "Math.Arithmetic.IsEven":
			result =
				numeric instanceof CanonicalArithmetic.Integer && numeric.integer % 2n == 0n ||
				numeric instanceof CanonicalArithmetic.Decimal && numeric.decimal.isInteger() && numeric.decimal.div(2).isInteger()
			;
			break;
			
		case "Math.Arithmetic.IsOdd":
			result =
				numeric instanceof CanonicalArithmetic.Integer && numeric.integer % 2n != 0n ||
				numeric instanceof CanonicalArithmetic.Decimal && numeric.decimal.isInteger() && !numeric.decimal.div(2).isInteger()
			;
			break;
	}
	
	is.replaceBy(Formulae.createExpression(result ? "Logic.True" : "Logic.False"));
	return true;
};

Arithmetic.toX = async (to, session) => {
	if (!to.children[0].isInternalNumber()) return false;
	let number = to.children[0].get("Value");
	
	let newNumber = null;
	
	switch (to.getTag()) {
		case "Math.Arithmetic.ToInteger":
			if (number instanceof CanonicalArithmetic.Decimal) {
				if (number.decimal.isInteger()) {
					newNumber = new CanonicalArithmetic.Integer(BigInt(number.decimal.toFixed()));
				}
				else {
					return false;
				}
			}
			break;
			
		case "Math.Arithmetic.ToIfInteger":
			if (number instanceof CanonicalArithmetic.Decimal) {
				if (number.decimal.isInteger()) {
					newNumber = new CanonicalArithmetic.Integer(BigInt(number.decimal.toFixed()));
				}
			}
			break;
			
		case "Math.Arithmetic.ToDecimal":
			if (number instanceof CanonicalArithmetic.Integer) {
				newNumber = new CanonicalArithmetic.Decimal(new session.Decimal(number.integer.toString()));
			}
			break;
	}
	
	if (newNumber === null) {
		to.replaceBy(to.children[0]);
	}
	else {
		to.replaceBy(CanonicalArithmetic.canonical2InternalNumber(newNumber));
	}
	
	return true;
};

Arithmetic.toNumber = async (toNumber, session) => {
	let arg = toNumber.children[0];
	if (arg.getTag() !== "String.String") return false;
	let s = arg.get("Value");
	
	let base = 10;
	if (toNumber.children.length >= 2) {
		base = CanonicalArithmetic.getInteger(toNumber.children[1]);
		if (base < 2 || base > 36) return false;
	}
	
	if (base == 10) {
		let result = s.match(/[-]?[0-9]+[.]?[0-9]*/);
		if (result === null || result[0] !== s) return false;
		let point = s.indexOf(".") >= 0;
		toNumber.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				point ?
				new CanonicalArithmetic.Decimal(new session.Decimal(s)) :
				new CanonicalArithmetic.Integer(BigInt(s))
			)
		);
		return true;
	}
	else {
		// 0-9 48-57
		// a-z 97-122
		// A-Z 65-90
		//  -  45
		//  .  46
		
		let cp;
		let i = 0;
		let point = false;
		let number = new session.Decimal(0);
		let fraction = new session.Decimal(1);
		let negative = false;
			
		for (const codePoint of s) {
  			cp = codePoint.codePointAt(0);
  			
  			// minus sign
  			if (cp == 45) {
  				if (i != 0) return false;
  				negative = true;
  				continue;
  			}
  			
  			// decimal pont
  			if (cp == 46) {
				if (point) return false;
				point = true;
				continue;
			}
  			
  			// digit
  			if (cp >= 48 && cp <= 47 + base) {
				cp -= 48;
			}
			else if (cp >= 65 && cp <= 55 + base) {
				cp -= 55;
			}
			else if (cp >= 97 && cp <= 87 + base) {
				cp -= 87;
			}
			else {
				return false;
			}
			
			// ok
			if (!point) {
				number = session.Decimal.add(session.Decimal.mul(number, base), cp);
			}
			else {
				fraction = session.Decimal.div(fraction, base);
				number = session.Decimal.add(number, session.Decimal.mul(fraction, cp));
			}
  			
  			++i;
  		}
		
  		if (i == 0) return false;
		if (negative) number = number.negated();
		
		toNumber.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				point ?
				new CanonicalArithmetic.Decimal(number) :
				new CanonicalArithmetic.Integer(BigInt(number.toFixed()))
			)
		);
		
		return true;
	}
};

Arithmetic.factorial = async (factorial, session) => {
	let number = CanonicalArithmetic.getInteger(factorial.children[0]);
	if (number === undefined || number < 0n) return false;
	
	let result = 1n;
	for (let i = 2n; i <= number; ++i) result *= i;
	
	factorial.replaceBy(
		CanonicalArithmetic.canonical2InternalNumber(
			new CanonicalArithmetic.Integer(result)
		)
	);
	
	return true;
};

Arithmetic.toString = async (toString, session) => {
	if (!toString.children[0].isInternalNumber()) return false;
	let number = toString.children[0].get("Value");
	
	let base = 10;
	if (toString.children.length >= 2) {
		base = CanonicalArithmetic.getInteger(toString.children[1]);
		if (base === undefined) return false;
	}
	
	if (base == 10n) {
		let expr = Formulae.createExpression("String.String");
		
		if (number instanceof CanonicalArithmetic.Integer) {
			expr.set("Value", number.integer.toString());
		}
		else if (number instanceof CanonicalArithmetic.Decimal){
			expr.set("Value", number.decimal.toFixed());
		}
		else { // rational
			return false;
		}
		
		toString.replaceBy(expr);
		return true;
	}
	
	return false;
};

Arithmetic.digits = async (digits, session) => {
	if (!digits.children[0].isInternalNumber()) return false;
	let number = digits.children[0].get("Value");
	if (number === null || number instanceof CanonicalArithmetic.Decimal || number.isNegative()) return false;
	
	let base = 10n;
	if (digits.children.length >= 2) {
		base = CanonicalArithmetic.getInteger(digits.children[1]);
		if (base === undefined || base < 2 ) return false;
		base = BigInt(base);
	}

	let expr = Formulae.createExpression("List.List");
	let quotient = number.integer;
	let remainder;
	
	do {
		remainder = quotient % base;
		quotient = quotient / base;
		expr.addChildAt(
			0,
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(remainder)
			)
		);
	} while (quotient != 0n);
	
	if (digits.children.length >= 3) {
		let size = CanonicalArithmetic.getInteger(digits.children[2]);
		if (size === undefined || base < 1 ) return false;
		if (size > expr.children.length) {
			for (let i = 0, n = size - expr.children.length; i < n; ++i) {
				expr.addChildAt(
					0,
					CanonicalArithmetic.canonical2InternalNumber(
						new CanonicalArithmetic.Integer(0n)
					)
				);
			}
		}
	}
	
	digits.replaceBy(expr);
	return true;
};

Arithmetic.toTime = async (toTime, session) => {
	let number = CanonicalArithmetic.getInteger(toTime.children[0]);
	if (number === undefined) return false;
	if (number < -8_640_000_000_000_000 || number > 8_640_000_000_000_000) return false;
	
	let expr = Formulae.createExpression("Time.Time");
	expr.set("Value", number);
	toTime.replaceBy(expr);
	return true;
};

Arithmetic.gcdLcm = async (gcdLcm, session) => {
	let list = gcdLcm.children[0];
	if (list.getTag() !== "List.List") return false;
	let isGcd = gcdLcm.getTag() === "Math.Arithmetic.GreatestCommonDivisor";
	let pos, n = list.children.length;
	let pivot;
	
	for (pos = 0; pos < n; ++pos) {
		pivot = CanonicalArithmetic.getBigInt(list.children[pos]);
		if (pivot !== undefined) break;
	}
	
	if (pos >= n) return false; // there was no numeric, integer addends
	
	// there was a numeric child, index is (pos)
	let sibling;
	let performed = false;
	let r = pivot;
	
	for (let i = n - 1; i > pos; --i) {
		sibling = CanonicalArithmetic.getBigInt(list.children[i]);
		
		if (sibling != undefined) {
			if (isGcd) {
				r = CanonicalArithmetic.gcd(r, sibling);
			}
			else {   // LCM(a, b) = | ab | / GCD(a, b)
				r = CanonicalArithmetic.abs(r * sibling) / CanonicalArithmetic.gcd(r, sibling);
			}
			
			list.removeChildAt(i);
			performed = true;
		}
	}
		
	if (list.children.length == 1) { // just one child
		gcdLcm.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(r)
			)
		)
		return true;
	}
	else { // more than one child
		if (pos == 0) {
			if (performed) {
				list.setChild(
					0,
					CanonicalArithmetic.canonical2InternalNumber(
						new CanonicalArithmetic.Integer(r)
					)
				);
			}
		}
		else {
			list.removeChildAt(pos);
			list.addChildAt(
				0,
				CanonicalArithmetic.canonical2InternalNumber(
					new CanonicalArithmetic.Integer(r)
				)
			);
			//performed = true;
		}
	}
	
	return false; // Ok, forward to other forms of GCD/LCM(...)
};

Arithmetic.factors = async (factors, session) => {
	let n = CanonicalArithmetic.getBigInt(factors.children[0]);
	if (n === undefined || n <= 2n) return false;

	let list = Formulae.createExpression("List.List");
	
	while ((n % 2n) == 0n) {
		list.addChild(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(2n)
			)
		);
		n = n / 2n;
	}
	
	if (n > 1n) {
		let f = 3n;
		while ((f * f) <= n) {
			if ((n % f) == 0n) {
				list.addChild(
					CanonicalArithmetic.canonical2InternalNumber(
						new CanonicalArithmetic.Integer(f)
					)
				);
				n = n / f;
			}
			else {
				f = f + 2n;
			}
		}
		
		list.addChild(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(n)
			)
		);
	}
	
	factors.replaceBy(list);
	return true;
};

Arithmetic.divisionTest = async (divisionTest, session) => {
	let divisor = CanonicalArithmetic.getBigInt(divisionTest.children[0]);
	if (divisor === undefined || divisor === 0n) return false;
	
	let multiple = CanonicalArithmetic.getBigInt(divisionTest.children[1]);
	if (multiple === undefined) return false;
	
	// DO NOT remove the part
	// + 0n
	// It causes closure compiler to behaves bad !!! 
	
	let rem = (multiple % divisor) + 0n;
	let divides = rem == 0n;
	
	if (divisionTest.getTag() === "Math.Arithmetic.DoesNotDivide") {
		divides = !divides;
	}
	
	divisionTest.replaceBy(Formulae.createExpression(divides ? "Logic.True" : "Logic.False"));
	return true;
};

Arithmetic.random = (random, session) => {
	let prec = null;
	if (random.children.length >= 1) {
		prec = CanonicalArithmetic.getBigInt(random.children[0]);
		if (prec === undefined || prec < 1n) return false;
	}
	
	random.replaceBy(
		CanonicalArithmetic.canonical2InternalNumber(
			new CanonicalArithmetic.Decimal(
				prec === null ? session.Decimal.random() : session.Decimal.random(Number(prec))
			)
		)
	);
	
	return true;
};

Arithmetic.randomInRange = async (randomInRange, session) => {
	let n1 = CanonicalArithmetic.getInteger(randomInRange.children[0]);
	if (n1 === undefined) return false;
	
	let n2 = CanonicalArithmetic.getInteger(randomInRange.children[1]);
	if (n2 === undefined) return false;
	
	if (n1 == n2) return false;

	let x = Math.min(n1, n2) + Math.trunc(Math.random() * (Math.abs(n2 - n1) + 1));
	
	randomInRange.replaceBy(
		CanonicalArithmetic.canonical2InternalNumber(
			new CanonicalArithmetic.Integer(BigInt(x))
		)
	);
	
	return true;
};

Arithmetic.piecewise = async (piecewise, session) => {
	let cases = Math.floor(piecewise.children.length / 2);
	let result, bkp = null;
	
	cases: for (let c = 0; c < cases; ++c) {
		if (c == 0) bkp = piecewise.children[2 * c + 1].clone();
		
		result = await session.reduceAndGet(piecewise.children[2 * c + 1], 2 * c + 1);
		
		switch (result.getTag()) {
			case "Logic.True":
				piecewise.replaceBy(result = piecewise.children[2 * c]);
				await session.reduce(result);
				return true;
			
			case "Logic.False":
				continue cases;
			
			default:
				if (c == 0) {
					piecewise.setChild(2 * c + 1, bkp);
					return false;
				}
				else {
					ReductionManager.setInError(piecewise.children[2 * c + 1], "Expression must be boolean");
					throw new ReductionError();
				}
		}
	}
	
	// otherwise (if any)
	
	if ((piecewise.children.length % 2) != 0) {
		piecewise.replaceBy(result = piecewise.children[piecewise.children.length - 1]);
		await session.reduce(result);
		return true;
	}
	
	// reduce to null
	
	piecewise.replaceBy(factory.createExpression("Null"));
	return true;
};

Arithmetic.nPi = async (n, session) => {
	if (n.children.length > 1 || n.children[0].getTag() !== "Math.Constant.Pi") return false;
	
	n.replaceBy(
		CanonicalArithmetic.canonical2InternalNumber(
			new CanonicalArithmetic.Decimal(
				session.Decimal.acos(-1.0)
			)
		)
	);
	
	return true;
};

Arithmetic.nE = async (n, session) => {
	if (n.children.length > 1 || n.children[0].getTag() !== "Math.Constant.Euler") return false;
	
	n.replaceBy(
		CanonicalArithmetic.canonical2InternalNumber(
			new CanonicalArithmetic.Decimal(
				session.Decimal.exp(1.0)
			)
		)
	);
	
	return true;
};

Arithmetic.summationProductReducer = async (summationProduct, session) => {
	let n = summationProduct.children.length;
	let summation = summationProduct.getTag() === "Math.Arithmetic.Summation";
	let result;
	
	if (n == 2) {
		let arg = await session.reduceAndGet(summationProduct.children[0], 0);
		let _N = await session.reduceAndGet(summationProduct.children[1], 1);
		
		let N = CanonicalArithmetic.getInteger(_N);
		if (N === undefined) return false;
		
		result = Formulae.createExpression(
			summation ?
			"Math.Arithmetic.Addition" :
			"Math.Arithmetic.Multiplication"
		);
		
		for (let i = 0; i < N; ++i) {
			result.addChild(arg.clone());
		}
		
		summationProduct.replaceBy(result);
		
		//session.log(summation ? "Summation created" : "Product created");
	}
	else {
		// symbol
		let symbol = summationProduct.children[1];
		if (symbol.getTag() !== "Symbolic.Symbol") {
			return false;
		}
		
		for (let i = 2; i < n; ++i) {
			await session.reduce(summationProduct.children[i]);
		}
		
		// from
		let from;
		if (n >= 4) {
			if (!summationProduct.children[2].isInternalNumber()) return false;
			from = summationProduct.children[2].get("Value");
		}
		else {
			from = new CanonicalArithmetic.Integer(1n);
		}
		
		// to
		if (!summationProduct.children[n == 3 ? 2 : 3].isInternalNumber()) return false;
		let to = summationProduct.children[n == 3 ? 2 : 3].get("Value");
		
		// step
		let step;
		if (n == 5) {
			if (!summationProduct.children[4].isInternalNumber()) return false;
			step = summationProduct.children[4].get("Value");
		}
		else {
			step = new CanonicalArithmetic.Integer(1n);
		}
		
		if (step.isZero()) return false;
		
		// sign
		let negative = step.isNegative();
		
		result = Formulae.createExpression(
			summation ?
			"Math.Arithmetic.Addition" :
			"Math.Arithmetic.Multiplication"
		);
		
		//////////////////////////////////////
		
		result.createScope();
		let scopeEntry = new ScopeEntry();
		result.putIntoScope(symbol.get("Name"), scopeEntry, false);
		
		summationProduct.replaceBy(result);
		//session.log(summation ? "Sum created" : "Product created");
		
		let arg = summationProduct.children[0];
		let clone;
		
		filling: while (true) {
			if (negative) {
				if (from.comparison(to, session) < 0) {
					break filling;
				}
			}
			else {
				if (from.comparison(to, session) > 0) {
					break filling;
				}
			}
			
			scopeEntry.setValue(
				CanonicalArithmetic.canonical2InternalNumber(from)
			);
			
			result.addChild(clone = arg.clone());
			//session.log("Element created");
			
			await session.reduce(clone);
			
			from = from.addition(step, session);
		}
		
		result.removeScope();
	}
	
	if ((n = result.children.length) == 0) {
		result.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(summation ? 0n : 1n)
			)
		);
	}
	else if (n == 1) {
		result.replaceBy(result.children[0]);
	}
	else {
		await session.reduce(result);
	}
	
	return true;
};

Arithmetic.summationProductListReducer = async (summationProduct, session) => {
	if (summationProduct.children.length != 3) return false;
	let summation = summationProduct.getTag() === "Math.Arithmetic.Summation";
	
	let symbol = summationProduct.children[1];
	if (symbol.getTag() !== "Symbolic.Symbol") {
		return false;
	}
	
	let list = await session.reduceAndGet(summationProduct.children[2], 2);
	if (list.getTag() !== "List.List") {
		return false;
	}
	
	let arg = summationProduct.children[0];
	
	let result = Formulae.createExpression(
		summation ?
		"Math.Arithmetic.Addition" :
		"Math.Arithmetic.Multiplication"
	);
	
	summationProduct.replaceBy(result);
	//session.log(summation ? "Sum created" : "Product created");
	
	result.createScope();
	let scopeEntry = new ScopeEntry();
	result.putIntoScope(symbol.get("Name"), scopeEntry, false);
	
	for (let i = 0, n = list.children.length; i < n; ++i) {
		scopeEntry.setValue(list.children[i].clone());
		result.addChild(arg.clone());
		
		result.unlockScope();
		await session.reduce(result.children[i]);
		result.lockScope();
	}
	
	result.removeScope();
	
	let n = result.children.length;
	if (n == 0) {
		result.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				new CanonicalArithmetic.Integer(
					summation ? 0n : 1n
				)
			)
		);
	}
	else if (n == 1) {
		result.replaceBy(result.children[0]);
	}
	else {
		await session.reduce(result);
	}
	
	return true;
};

/**
	Modular exponetiation
	given b, e, m: BigInt
	returns (b ^ e) mod m
 */

Arithmetic.modularExponentiationNumeric = (x, y, p) => {
	// Initialize result
	let res = 1;
	
	// Update x if it is more than or
	// equal to p
	x = x % p;
	while (y > 0) {
		// If y is odd, multiply
		// x with result
		if (y & 1) {
			res = (res * x) % p;
		}
		
		// y must be even now
		y = y >> 1; // y = y/2
		x = (x * x) % p;
	}
	return res;
};

/**
	Miller-Rabin primality test
 */

Arithmetic.millerRabinTestNumeric = (n, d) => {
	// Pick a random number in [2..n-2]
	// Corner cases make sure that n > 4
	let a = 2 + Math.floor(Math.random() * (n - 2)) % (n - 4);
	
	// Compute a^d % n
	let x = Arithmetic.modularExponentiationNumeric(a, d, n);
	
	if (x == 1 || x == n - 1) {
		return true;
	}
	
	// Keep squaring x while one
	// of the following doesn't
	// happen
	// (i) d does not reach n-1
	// (ii) (x^2) % n is not 1
	// (iii) (x^2) % n is not n-1
	
	while (d != n - 1) {
		x = (x * x) % n;
		d *= 2;
		
		if (x == 1) return false;
		if (x == n - 1) return true;
	}
	
	// Return composite
	return false;
};

Arithmetic.isProbablePrimeNumeric = (n, k) => {
	// Corner cases
	if (n <= 1 || n == 4) return false;
	if (n <= 3) return true;
	
	// Find r such that n =
	// 2^d * r + 1 for some r >= 1
	
	let d = n - 1;
	while (d % 2 == 0) {
		d /= 2;
	}
	
	// Iterate given number of 'k' times
	
	for (let i = 0; i < k; ++i) {
		if (!Arithmetic.millerRabinTestNumeric(n, d)) {
			return false;
		}
	}
	
	return true;
};

Arithmetic.isPrime = async (isPrime, session) => {
	if (!isPrime.children[0].isInternalNumber()) return false;
	let n = isPrime.children[0].get("Value");
	
	if (!(n instanceof CanonicalArithmetic.Integer) || n.integer < 0n) {
		ReductionManager.setInError(isPrime.children[0], "Expression must be an integer, non-negative number");
		throw new ReductionError();
	}
	
	if (n.integer > Number.MAX_SAFE_INTEGER) {
		ReductionManager.setInError(isPrime.children[0], "Number is too big");
		throw new ReductionError();
	}
	
	n = Number(n.integer);
	isPrime.replaceBy(
		Formulae.createExpression(
			Arithmetic.isProbablePrimeNumeric(n, 17) ? "Logic.True" : "Logic.False"
		)
	);
	return true;
};

Arithmetic.setReducers = () => {
	// precision
	
	ReductionManager.addReducer("Math.Arithmetic.SignificantDigits", Arithmetic.significantDigits, "Arithmetic.significantDigits");
	ReductionManager.addReducer("Math.Arithmetic.SetPrecision",      Arithmetic.setPrecision,      "Arithmetic.setPrecision");
	ReductionManager.addReducer("Math.Arithmetic.GetPrecision",      Arithmetic.getPrecision,      "Arithmetic.getPrecision");
	ReductionManager.addReducer("Math.Arithmetic.WithPrecision",     Arithmetic.withPrecision,     "Arithmetic.withPrecision", { special: true });
	
	// rounding
	
	// rounding mode
	
	ReductionManager.addReducer("Math.Arithmetic.SetRoundingMode", Arithmetic.setRoundingMode, "Arithmetic.setRoundingMode");
	ReductionManager.addReducer("Math.Arithmetic.GetRoundingMode", Arithmetic.getRoundingMode, "Arithmetic.getRoundingMode");
	
	ReductionManager.addReducer("Math.Arithmetic.SetEuclideanDivisionMode", Arithmetic.setEuclideanDivisionMode, "Arithmetic.setEuclideanDivisionMode");
	ReductionManager.addReducer("Math.Arithmetic.GetEuclideanDivisionMode", Arithmetic.getEuclideanDivisionMode, "Arithmetic.getEuclideanDivisionMode");
	
	ReductionManager.addReducer("Math.Numeric", Arithmetic.nNumeric,               "Arithmetic.nNumeric");
	ReductionManager.addReducer("Math.Numeric", Arithmetic.nPrecision,             "Arithmetic.nPrecision", { special: true, precedence: ReductionManager.PRECEDENCE_HIGH});
	ReductionManager.addReducer("Math.Numeric", Arithmetic.nPi,                    "Arithmetic.nPi");
	ReductionManager.addReducer("Math.Numeric", Arithmetic.nE,                     "Arithmetic.nE");
	ReductionManager.addReducer("Math.Numeric", ReductionManager.expansionReducer, "ReductionManager.expansionReducer", { precedence: ReductionManager.PRECEDENCE_LOW});
	
	ReductionManager.addReducer("Math.Arithmetic.Negative",       Arithmetic.negativeNumeric,        "Arithmetic.negativeNumeric");
	ReductionManager.addReducer("Math.Arithmetic.Addition",       Arithmetic.additionNumeric,        "Arithmetic.additionNumeric");
	ReductionManager.addReducer("Math.Arithmetic.Multiplication", Arithmetic.multiplicationNumeric,  "Arithmetic.multiplicationNumeric");
	ReductionManager.addReducer("Math.Arithmetic.Division",       Arithmetic.divisionNumerics,       "Arithmetic.divisionNumerics");
	ReductionManager.addReducer("Math.Arithmetic.Exponentiation", Arithmetic.exponentiationNumerics, "Arithmetic.exponentiationNumerics");
	
	ReductionManager.addReducer("Relation.Compare", Arithmetic.comparisonNumerics, "Arithmetic.comparisonNumerics");
	
	ReductionManager.addReducer("Math.Arithmetic.Rationalize",   Arithmetic.rationalize, "Arithmetic.rationalize");
	ReductionManager.addReducer("Math.Arithmetic.AbsoluteValue", Arithmetic.absNumeric,  "Arithmetic.absNumeric");
	ReductionManager.addReducer("Math.Arithmetic.Sign",          Arithmetic.signNumeric, "Arithmetic.signNumeric");
	
	// rounding
	
	ReductionManager.addReducer("Math.Arithmetic.RoundToPrecision",     Arithmetic.roundToPrecision,     "Arithmetic.roundToPrecision");
	ReductionManager.addReducer("Math.Arithmetic.RoundToInteger",       Arithmetic.roundToInteger,       "Arithmetic.roundToInteger");
	ReductionManager.addReducer("Math.Arithmetic.RoundToDecimalPlaces", Arithmetic.roundToDecimalPlaces, "Arithmetic.roundToDecimalPlaces");
	ReductionManager.addReducer("Math.Arithmetic.RoundToMultiple",      Arithmetic.roundToMultiple,      "Arithmetic.roundToMultiple");
	
	ReductionManager.addReducer("Math.Arithmetic.Truncate", Arithmetic.floorCeilingRoundTruncate, "Arithmetic.floorCeilingRoundTruncate");
	ReductionManager.addReducer("Math.Arithmetic.Ceiling",  Arithmetic.floorCeilingRoundTruncate, "Arithmetic.floorCeilingRoundTruncate");
	ReductionManager.addReducer("Math.Arithmetic.Floor",    Arithmetic.floorCeilingRoundTruncate, "Arithmetic.floorCeilingRoundTruncate");
	ReductionManager.addReducer("Math.Arithmetic.Round",    Arithmetic.floorCeilingRoundTruncate, "Arithmetic.floorCeilingRoundTruncate");
	
	ReductionManager.addReducer("Math.Arithmetic.Div",    Arithmetic.divMod, "Arithmetic.divMod");
	ReductionManager.addReducer("Math.Arithmetic.Mod",    Arithmetic.divMod, "Arithmetic.divMod");
	ReductionManager.addReducer("Math.Arithmetic.DivMod", Arithmetic.divMod, "Arithmetic.divMod");
	
	ReductionManager.addReducer("Math.Arithmetic.ModularExponentiation"       , Arithmetic.modPow,     "Arithmetic.modPow");
	ReductionManager.addReducer("Math.Arithmetic.ModularMultiplicativeInverse", Arithmetic.modInverse, "Arithmetic.modInverse");
	
	ReductionManager.addReducer("Math.Transcendental.NaturalLogarithm", Arithmetic.log, "Arithmetic.log");
	ReductionManager.addReducer("Math.Transcendental.DecimalLogarithm", Arithmetic.log, "Arithmetic.log");
	ReductionManager.addReducer("Math.Transcendental.BinaryLogarithm",  Arithmetic.log, "Arithmetic.log");
	ReductionManager.addReducer("Math.Transcendental.Logarithm",        Arithmetic.log, "Arithmetic.log");
	
	ReductionManager.addReducer("Math.Arithmetic.SquareRoot", Arithmetic.sqrt, "Arithmetic.sqrt");
	
	ReductionManager.addReducer("Math.Trigonometric.Sine",         Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.Cosine",       Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.Tangent",      Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.Cotangent",    Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.Secant",       Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.Cosecant",     Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.ArcSine",      Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.ArcCosine",    Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.ArcTangent",   Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.ArcCotangent", Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.ArcSecant",    Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.ArcCosecant",  Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.ArcTangent2",  Arithmetic.atan2,     "Arithmetic.atan2");
	
	ReductionManager.addReducer("Math.Hyperbolic.Sine",            Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.Cosine",          Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.Tangent",         Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.Cotangent",       Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.Secant",          Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.Cosecant",        Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.ArcSine",         Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.ArcCosine",       Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.ArcTangent",      Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.ArcCotangent",    Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.ArcSecant",       Arithmetic.trigHyper, "Arithmetic.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.ArcCosecant",     Arithmetic.trigHyper, "Arithmetic.trigHyper");
	
	ReductionManager.addReducer("Math.Arithmetic.IntegerPart",    Arithmetic.integerPart,    "Arithmetic.integerPart");
	ReductionManager.addReducer("Math.Arithmetic.FractionalPart", Arithmetic.fractionalPart, "Arithmetic.fractionalPart");
	ReductionManager.addReducer("Math.Arithmetic.DecimalPlaces",  Arithmetic.decimalPlaces,  "Arithmetic.decimalPlaces");
	
	ReductionManager.addReducer("Math.Arithmetic.IsRealNumber",     Arithmetic.isX, "Arithmetic.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsRationalNumber", Arithmetic.isX, "Arithmetic.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsNumeric",        Arithmetic.isX, "Arithmetic.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsIntegerValue",   Arithmetic.isX, "Arithmetic.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsInteger",        Arithmetic.isX, "Arithmetic.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsDecimal",        Arithmetic.isX, "Arithmetic.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsNegativeNumber", Arithmetic.isX, "Arithmetic.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsPositiveNumber", Arithmetic.isX, "Arithmetic.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsNumberZero",     Arithmetic.isX, "Arithmetic.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsEven",           Arithmetic.isX, "Arithmetic.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsOdd",            Arithmetic.isX, "Arithmetic.isX");
	
	ReductionManager.addReducer("Math.Arithmetic.ToInteger",   Arithmetic.toX,      "Arithmetic.toX");
	ReductionManager.addReducer("Math.Arithmetic.ToIfInteger", Arithmetic.toX,      "Arithmetic.toX");
	ReductionManager.addReducer("Math.Arithmetic.ToDecimal",   Arithmetic.toX,      "Arithmetic.toX");
	ReductionManager.addReducer("Math.Arithmetic.ToNumber",    Arithmetic.toNumber, "Arithmetic.toNumber");
	
	ReductionManager.addReducer("Math.Arithmetic.Factorial", Arithmetic.factorial, "Arithmetic.factorial");
	
	ReductionManager.addReducer("String.ToString", Arithmetic.toString, "Arithmetic.toString");
	ReductionManager.addReducer("Time.ToTime",     Arithmetic.toTime,   "Arithmetic.toTime");
	
	ReductionManager.addReducer("Math.Arithmetic.Digits", Arithmetic.digits, "Arithmetic.digits");
	
	ReductionManager.addReducer("Math.Arithmetic.GreatestCommonDivisor", Arithmetic.gcdLcm, "Arithmetic.gcdLcm");
	ReductionManager.addReducer("Math.Arithmetic.LeastCommonMultiple",   Arithmetic.gcdLcm, "Arithmetic.gcdLcm");
	
	ReductionManager.addReducer("Math.Arithmetic.Factors", Arithmetic.factors, "Arithmetic.factors");
	
	ReductionManager.addReducer("Math.Arithmetic.Divides",       Arithmetic.divisionTest, "Arithmetic.divisionTest");
	ReductionManager.addReducer("Math.Arithmetic.DoesNotDivide", Arithmetic.divisionTest, "Arithmetic.divisionTest");
	
	ReductionManager.addReducer("Math.Arithmetic.Random",        Arithmetic.random,        "Arithmetic.random");
	ReductionManager.addReducer("Math.Arithmetic.RandomInRange", Arithmetic.randomInRange, "Arithmetic.randomInRange");
	
	ReductionManager.addReducer("Math.Arithmetic.Piecewise", Arithmetic.piecewise, "Arithmetic.piecewise", { special: true });
	
	ReductionManager.addReducer("Math.Arithmetic.Summation", Arithmetic.summationProductReducer,     "Arithmetic.summationProductReducer", { special: true });
	ReductionManager.addReducer("Math.Arithmetic.Summation", Arithmetic.summationProductListReducer, "Arithmetic.summationProductListReducer", { special: true });
	ReductionManager.addReducer("Math.Arithmetic.Product",   Arithmetic.summationProductReducer    , "Arithmetic.summationProductReducer", { special: true });
	ReductionManager.addReducer("Math.Arithmetic.Product",   Arithmetic.summationProductListReducer, "Arithmetic.summationProductListReducer", { special: true });
	
	ReductionManager.addReducer("Math.Arithmetic.IsPrime", Arithmetic.isPrime, "Arithmetic.isPrime");
};
