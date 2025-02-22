/*
Fōrmulæ arithmetic package. Module for reduction.
Copyright (C) 2015-2025 Laurence R. Ugalde

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

'use strict';

export class Arithmetic extends Formulae.ReductionPackage {};

Arithmetic.TAG_NUMBER   = "Math.Number";
Arithmetic.TAG_INFINITY = "Math.Infinity";

/////////////////////
// internal number //
/////////////////////

Arithmetic.internalNumber = async (internalNumber, session) => {
	if (session.numeric || session.noSymbolic) {
		let number = internalNumber.get("Value");
		
		if (session.numeric && number.type !== 1) { // integer, rational or complex
			internalNumber.set("Value", number.toDecimal(session));
			return false;
		}
		
		if (session.noSymbolic && number.type === 2) { // rational
			internalNumber.set("Value", number.toDecimal(session));
			return false;
		}
	}
	
	return false;
};

///////////////
// precision //
///////////////

Arithmetic.significantDigits = async (significantDigits, session) => {
	if (!significantDigits.children[0].isInternalNumber()) return false;
	
	let number = significantDigits.children[0].get("Value");
	
	try {
		significantDigits.replaceBy(
			CanonicalArithmetic.createInternalNumber(
				CanonicalArithmetic.createInteger(
					number.significantDigits(),
					session
				),
				session
			)
		);
		return true;
	}
	catch (error) {
		return false;
	}
};

Arithmetic.setPrecision = async (setPrecision, session) => {
	let precisionExpr = await session.reduceAndGet(setPrecision.children[0], 0);
	let precision = CanonicalArithmetic.getNativeInteger(precisionExpr);
	if (precision === undefined || precision < 1 || precision > 1e+9) {
		ReductionManager.setInError(precisionExpr, "Expression must be a positive integer number");
		throw new ReductionError();
	}
	
	session.Decimal.precision = precision;
	return true;
};

Arithmetic.getPrecision = async (getPrecision, session) => {
	getPrecision.replaceBy(
		CanonicalArithmetic.createInternalNumber(
			CanonicalArithmetic.createInteger(session.Decimal.precision, session),
			session
		)
	);
	return true;
};

Arithmetic.withPrecision = async (withPrecision, session) => {
	let precisionExpr = await session.reduceAndGet(withPrecision.children[1], 1);
	let precision = CanonicalArithmetic.getNativeInteger(precisionExpr);
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

Arithmetic.decimalPlaces = async (decimalPlaces, session) => {
	if (!decimalPlaces.children[0].isInternalNumber()) return false;
	
	let number = decimalPlaces.children[0].get("Value");
	if (CanonicalArithmetic.isRational(number) || CanonicalArithmetic.isComplex(number)) return false;
	
	decimalPlaces.replaceBy(
		CanonicalArithmetic.createInternalNumber(
			CanonicalArithmetic.createInteger(number.decimalPlaces(), session),
			session
		)
	);
	
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

/////////////
// Numeric //
/////////////

// Numeric(expression, [precision])

Arithmetic.numeric = async (numeric, session) => {
	let precision = undefined;
	
	if (numeric.children.length >= 2) {
		let precisionExpr = await session.reduceAndGet(numeric.children[1], 1);
		precision = CanonicalArithmetic.getNativeInteger(precisionExpr);
		if (precision === undefined || precision <= 0) {
			ReductionManager.setInError(precisionExpr, "Expression must be a positive integer number");
			throw new ReductionError();
		}
	}
	
	let bkpNumeric = session.numeric;
	session.numeric = true;
	
	let bkpPrecision;
	if (precision !== undefined) {
		bkpPrecision = session.Decimal.precision;
		session.Decimal.set({ precision: precision });
	}
	
	await session.reduce(numeric.children[0]);
	
	if (precision !== undefined) {
		session.Decimal.set({ precision: bkpPrecision });
	}
	
	session.numeric = bkpNumeric;
	
	numeric.replaceBy(numeric.children[0]);
	return true;
};

////////////////////////
// Set as no symbolic //
////////////////////////

// SetNoSymbolic

Arithmetic.setNoSymbolic = async (setNoSymbolic, session) => {
	session.noSymbolic = true;
	return true;
};

/*
// N(numeric)

Arithmetic.nNumeric = async (n, session) => {
	if (n.children.length != 1) return false; // forward to N(expr, precision)
	
	if (!n.children[0].isInternalNumber()) return false;
	
	let number = n.children[0].get("Value");
	
	if (CanonicalArithmetic.isInteger(number)) {
		n.replaceBy(
			CanonicalArithmetic.canonical2InternalNumber(
				CanonicalArithmetic.ToDecimal(number, session)
			)
		);
		return true;
	}
	
	if (CanonicalArithmetic.isDecimal(number)) {
		n.replaceBy(n.children[0]);
		return true;
	}
	
	if (CanonicalArithmetic.isRational(number)) {
		n.replaceBy(
			CanonicalArithmetic.createInternalNumber(
				number.toDecimal(session),
				session
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
	let precision = CanonicalArithmetic.getNativeInteger(precisionExpr);
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
*/

//////////////
// addition //
//////////////

Arithmetic.additionNumeric = async (addition, session) => {
	let pos, n = addition.children.length;
	let number = null;
	
	for (pos = 0; pos < n; ++pos) {
		if (addition.children[pos].isInternalNumber()) {
			number = addition.children[pos].get("Value");
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
			number = CanonicalArithmetic.addition(number, addition.children[i].get("Value"), session);
			addition.removeChildAt(i);
			performed = true;
		}
	}
	
	if (number.isZero()) {
		switch (addition.children.length) {
			case 1:
				addition.replaceBy(
					CanonicalArithmetic.createInternalNumber(number, session)
				);
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
	
	let internalNumber = CanonicalArithmetic.createInternalNumber(number, session);
	
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
	let number = null;
	
	for (pos = 0; pos < n; ++pos) {
		if (multiplication.children[pos].isInternalNumber()) {
			number = multiplication.children[pos].get("Value");
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
			number = CanonicalArithmetic.multiplication(number, multiplication.children[i].get("Value"), session);
			multiplication.removeChildAt(i);
			performed = true;
		}
	}
	
	// Numeric result was zero
	
	if (number.isZero()) {
		multiplication.replaceBy(CanonicalArithmetic.createInternalNumber(number, session));
		return true;
	}
	
	// Numeric result was one
	
	if (number.isOne()) {
		switch (multiplication.children.length) {
			case 1:
				multiplication.replaceBy(CanonicalArithmetic.createInternalNumber(number, session));
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
	
	let internalNumber = CanonicalArithmetic.createInternalNumber(number, session);
	
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
				division.replaceBy(
					Formulae.createExpression(
						"Math.Arithmetic.Multiplication",
						CanonicalArithmetic.createInternalNumber(
							CanonicalArithmetic.createInteger(-1, session),
							session
						),
						infinity
					)
				);
				return true;
			}
			
			division.replaceBy(infinity);
			return true;
		}
		
		division.replaceBy(
			CanonicalArithmetic.createInternalNumber(
				CanonicalArithmetic.division(n, d, session),
				session
			)
		);
		return true;
	}
	
	return false; // Ok, forward to other forms of Division
};

////////////////////
// exponentiation //
////////////////////

// number ^ number

Arithmetic.exponentiationNumerics = async (exponentiation, session) => {
	if (
		exponentiation.children[0].isInternalNumber() &&
		exponentiation.children[1].isInternalNumber()
	) {
		let b = exponentiation.children[0].get("Value");
		let e = exponentiation.children[1].get("Value");
		
		let result;
		
		// 0 base
		
		if (b.isZero()) {
			if (e.isZero()) {
				if (CanonicalArithmetic.isInteger(b) && CanonicalArithmetic.isInteger(e)) { // 0 ^ 0
					result = CanonicalArithmetic.createInternalNumber(
						CanonicalArithmetic.isDecimal(b) || CanonicalArithmetic.isDecimal(e) ?
						CanonicalArithmetic.getDecimalOne(session) :
						CanonicalArithmetic.getIntegerOne(session),
						session
					);
				}
				else { // 0 ^ 0.0,   0.0 ^ 0,    0.0 ^ 0.0
					result = Formulae.createExpression("Undefined");
				}
			}
			else {
				if (CanonicalArithmetic.isComplex(e)) { // exponent is complex
					result = exponentiation.children[0];
				}
				else if (e.isPositive()) { // exponent is positive
					result = CanonicalArithmetic.createInternalNumber(
						CanonicalArithmetic.isDecimal(b) || CanonicalArithmetic.isDecimal(e) ?
						CanonicalArithmetic.getDecimalZero(session) :
						CanonicalArithmetic.getIntegerZero(session),
						session
					);
				}
				else { // exponent is negative
					result = Formulae.createExpression("Undefined");
				}
			}
			
			exponentiation.replaceBy(result);
			return true;
		}
		
		// 1 base
		
		//if (b.isOne) {
		//}
		
		// everything else
		
		try {
			result = CanonicalArithmetic.createInternalNumber(
				CanonicalArithmetic.exponentiation(b, e, session),
				session
			);
		}
		catch (e) {
			if (e instanceof CanonicalArithmetic.NonNumericError) {
				return false;
			}
			
			throw e;
		}
		
		exponentiation.replaceBy(result);
		return true;
	}
	
	return false; // Ok, forward to other forms of Division
};

Arithmetic.comparisonNumerics = async (comparisonExpression, session) => {
	if (
		!comparisonExpression.children[0].isInternalNumber() ||
		!comparisonExpression.children[1].isInternalNumber()
	) {
		return false;
	}
	
	try {
		let result = CanonicalArithmetic.comparison(
			comparisonExpression.children[0].get("Value"),
			comparisonExpression.children[1].get("Value"),
			session
		);
		
		let tag;
		switch (result) {
			case -1: tag = "Relation.Comparison.Less"; break;
			case  0: tag = "Relation.Comparison.Equals"; break;
			case  1: tag = "Relation.Comparison.Greater"; break;
			default: tag = "Relation.Comparison.Different"; break;
		}
		
		comparisonExpression.replaceBy(Formulae.createExpression(tag));
		return true;
	}
	catch (error) {
		return false;
	}
};

// number : canonical number
// n      : native Naumber

const movePointToRight = (number, n, session) => {
	return CanonicalArithmetic.multiplication(
		number,
		CanonicalArithmetic.exponentiation(
			CanonicalArithmetic.createInteger(10, session),
			CanonicalArithmetic.createInteger(n, session),
			session
		),
		session
	);
};

const rationalizeDecimal = (number, repeating, session) => {
	let decimalPlaces = number.decimalPlaces();
	let significantDigits = number.significantDigits();
	
	if (repeating === 0) {
		let bkpPrecision = session.Decimal.precision;
		session.Decimal.precision = significantDigits;
		
		let tenPow = CanonicalArithmetic.exponentiation(
			CanonicalArithmetic.createInteger(10, session),
			CanonicalArithmetic.createInteger(decimalPlaces, session),
			session
		);
		
		let rational = CanonicalArithmetic.createRational(
			CanonicalArithmetic.multiplication(number, tenPow, session).toInteger(session),
			tenPow
		);
		
		session.Decimal.precision = bkpPrecision;
		
		return rational;
	}
	else { // with repeating
		if (repeating > decimalPlaces) return null;
		
		let offset = decimalPlaces - repeating;
		
		let bkpPrecision = session.Decimal.precision;
		session.Decimal.precision = significantDigits;
		
		number = movePointToRight(number, offset, session);
		let integralPart = number.floor();
		let fractionalPart = movePointToRight(
			CanonicalArithmetic.addition(number, integralPart.negation(), session),
			repeating,
			session
		);
		let divisor1 = movePointToRight(
			CanonicalArithmetic.getIntegerOne(session),
			offset,
			session
		);
		let divisor2 = movePointToRight(
			CanonicalArithmetic.addition(
				movePointToRight(
					CanonicalArithmetic.getIntegerOne(session),
					repeating,
					session
				),
				CanonicalArithmetic.createInteger(-1, session),
				session
			),
			offset,
			session,
		);
		
		session.Decimal.precision = bkpPrecision;
		
		let rational1 = CanonicalArithmetic.createRational(
			integralPart.toInteger(session),
			divisor1
		);
		let rational2 = CanonicalArithmetic.createRational(
			fractionalPart.toInteger(session),
			divisor2
		);
		
		return CanonicalArithmetic.addition(rational1, rational2, session);
	}
};

Arithmetic.rationalize = async (rationalize, session) => {
	if (!rationalize.children[0].isInternalNumber()) return false;
	let number = rationalize.children[0].get("Value");
	
	switch (number.type) {
		case 1: { // decimal
			let repeating = 0;
			if (rationalize.children.length >= 2) {
				repeating = CanonicalArithmetic.getNativeInteger(rationalize.children[1]);
				if (repeating === undefined || repeating < 0) return false;
			}
			
			let rational = rationalizeDecimal(number, repeating, session);
			if (rational === null) return false;
			
			rationalize.replaceBy(CanonicalArithmetic.createInternalNumber(rational, session));
			return true;
		}
		
		case 0: // integer
		case 2: // rational
			rationalize.replaceBy(rationalize.children[0]);
			return true;
		
		case 3: // complex
			return false;
	}
	
	return false;
};

Arithmetic.absNumeric = async (abs, session) => {
	if (!abs.children[0].isInternalNumber()) return false;
	let number = abs.children[0].get("Value");
	
	if (CanonicalArithmetic.isComplex(number)) {
		let result = CanonicalArithmetic.createInternalNumber(
			CanonicalArithmetic.addition(
				number.real.multiplication(number.real, session),
				number.imaginary.multiplication(number.imaginary, session),
				session
			).squareRoot(session),
			session
		);
		abs.replaceBy(result);
		return true;
	}
	
	if (number.isNegative()) {
		abs.replaceBy(
			CanonicalArithmetic.createInternalNumber(number.negation(), session)
		);
	}
	else {
		abs.replaceBy(abs.children[0]);
	}
	
	return true;
};

Arithmetic.signNumeric = async (sign, session) => {
	if (!sign.children[0].isInternalNumber()) return false;
	let number = sign.children[0].get("Value");
	
	if (CanonicalArithmetic.isComplex(number)) return false;
	
	sign.replaceBy(
		CanonicalArithmetic.createInternalNumber(
			CanonicalArithmetic.createInteger(
				number.isZero() ? 0 : (number.isNegative() ? -1 : 1),
				session
			),
			session
		)
	);
	
	return true;
};

//////////////
// Rounding //
//////////////

Arithmetic.roundToPrecision = async (roundToPrecision, session) => {
	let expr = roundToPrecision.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	let precision = CanonicalArithmetic.getNativeInteger(roundToPrecision.children[1]);
	if (precision === undefined || precision <= 0n) return false;
	
	let roundingMode, bkpRoundingMode;
	if (roundToPrecision.children.length >= 3) {
		let tag = roundToPrecision.children[2].getTag();
		if (!tag.startsWith("Math.Arithmetic.RoundingMode.")) return false;
		roundingMode = Arithmetic.mapRoundingModes.get(tag);
	}
	
	if (roundingMode !== undefined) {
		bkpRoundingMode = session.Decimal.rounding;
		session.Decimal.set({ rounding: roundingMode });
	}
	
	expr.set("Value", n.roundToPrecision(precision, session));
	
	if (roundingMode !== undefined) {
		session.Decimal.set({ rounding: bkpRoundingMode });
	}
	
	roundToPrecision.replaceBy(expr);
	return true;
};

Arithmetic.roundToInteger = async (roundToInteger, session) => {
	let expr = roundToInteger.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	let roundingMode, bkpRoundingMode;
	if (roundToInteger.children.length >= 2) {
		let tag = roundToInteger.children[1].getTag();
		if (!tag.startsWith("Math.Arithmetic.RoundingMode.")) return false;
		roundingMode = Arithmetic.mapRoundingModes.get(tag);
	}
	
	if (roundingMode !== undefined) {
		bkpRoundingMode = session.Decimal.rounding;
		session.Decimal.set({ rounding: roundingMode });
	}
	
	expr.set("Value", n.roundToInteger(session));
	
	if (roundingMode !== undefined) {
		session.Decimal.set({ rounding: bkpRoundingMode });
	}
	
	roundToInteger.replaceBy(expr);
	return true;
};

Arithmetic.roundToDecimalPlaces = async (roundToDecimalPlaces, session) => {
	let expr = roundToDecimalPlaces.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	let places = CanonicalArithmetic.getNativeInteger(roundToDecimalPlaces.children[1]);
	if (places === undefined) return false;
	
	let roundingMode, bkpRoundingMode;
	if (roundToDecimalPlaces.children.length >= 3) {
		let tag = roundToDecimalPlaces.children[2].getTag();
		if (!tag.startsWith("Math.Arithmetic.RoundingMode.")) return false;
		roundingMode = Arithmetic.mapRoundingModes.get(tag);
	}
	
	if (roundingMode !== undefined) {
		bkpRoundingMode = session.Decimal.rounding;
		session.Decimal.set({ rounding: roundingMode });
	}
	
	expr.set("Value", n.roundToDecimalPlaces(places, session));
	
	if (roundingMode !== undefined) {
		session.Decimal.set({ rounding: bkpRoundingMode });
	}
	
	roundToDecimalPlaces.replaceBy(expr);
	return true;
};

Arithmetic.roundToMultiple = async (roundToMultiple, session) => {
	let expr = roundToMultiple.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	let multiple = roundToMultiple.children[1];
	if (!multiple.isInternalNumber()) return false;
	multiple = multiple.get("Value");
	
	if (CanonicalArithmetic.isComplex(n) || CanonicalArithmetic.isComplex(multiple)) return false;
	
	let roundingMode, bkpRoundingMode;
	if (roundToMultiple.children.length >= 3) {
		let tag = roundToMultiple.children[2].getTag();
		if (!tag.startsWith("Math.Arithmetic.RoundingMode.")) return false;
		roundingMode = Arithmetic.mapRoundingModes.get(tag);
	}
	
	if (roundingMode !== undefined) {
		bkpRoundingMode = session.Decimal.rounding;
		session.Decimal.set({ rounding: roundingMode });
	}
	
	expr.set(
		"Value",
		CanonicalArithmetic.multiplication(CanonicalArithmetic.divMod(n, multiple, true, false, session), multiple, session)
	);
	
	if (roundingMode !== undefined) {
		session.Decimal.set({ rounding: bkpRoundingMode });
	}
	
	roundToMultiple.replaceBy(expr);
	return true;
};

Arithmetic.floorCeilingRoundTruncate = async (fcrt, session) => {
	let expr = fcrt.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	let places = 0;
	
	if (fcrt.children.length >= 2) { // there is decimal places
		if ((places = CanonicalArithmetic.getNativeInteger(fcrt.children[1])) === undefined) {
			ReductionManager.setInError(fcrt.children[1], "Expression must be an integer number");
			throw new ReductionError();
		}
	}
	
	let roundingMode;
	switch (fcrt.getTag()) {
		case "Math.Arithmetic.Truncate": roundingMode = 1; break;
		case "Math.Arithmetic.Ceiling" : roundingMode = 2; break;
		case "Math.Arithmetic.Floor"   : roundingMode = 3; break;
		case "Math.Arithmetic.Round"   : roundingMode = 5; break;
	}
	
	let bkpRoundingMode = session.Decimal.rounding;
	session.Decimal.set({ rounding: roundingMode });
	
	switch (n.type) {
		case 0: // integer
		case 2: // rational
			n = n.toDecimal(session).roundToDecimalPlaces(-places, session);
			break;
		
		case 1: // decimal
			n = n.roundToDecimalPlaces(-places, session);
			break;
	}
	
	session.Decimal.set({ rounding: bkpRoundingMode });
	
	if (places <= 0) {
		n = n.toInteger(session);
	}
	
	//expr.set("Value", n.roundToDecimalPlaces(places, session));
	
	fcrt.replaceBy(CanonicalArithmetic.createInternalNumber(n, session));
	return true;
};

Arithmetic.divMod = async (divMod, session) => {
	if (!divMod.children[0].isInternalNumber()) return false;
	let dividend = divMod.children[0].get("Value");
	
	if (!divMod.children[1].isInternalNumber()) return false;
	let divisor = divMod.children[1].get("Value");
	
	if (
		CanonicalArithmetic.isComplex(dividend) ||
		CanonicalArithmetic.isComplex(divisor)
	) return false;
	
	if (divisor.isZero()) {
		divMod.replaceBy(Formulae.createExpression("Math.Infinity"));
		return true;
	}
	
	let tag = divMod.getTag();
	let isDiv = tag.includes("Div");
	let isMod = tag.includes("Mod");
	
	let dm = CanonicalArithmetic.divMod(dividend, divisor, isDiv, isMod, session);
	
	let result;
	
	if (isDiv && isMod) {
		result = Formulae.createExpression(
			"List.List",
			CanonicalArithmetic.createInternalNumber(dm[0], session),
			CanonicalArithmetic.createInternalNumber(dm[1], session)
		);
	}
	else {
		result = CanonicalArithmetic.createInternalNumber(dm, session)
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
	if (!CanonicalArithmetic.isInteger(b) || b.isNegative()) {
		ReductionManager.setInError(modPow.children[0], "Base must be an integer, non-negative number");
		throw new ReductionError();
	}
	
	let e = modPow.children[1].get("Value");
	if (!CanonicalArithmetic.isInteger(e) || e.isNegative()) {
		ReductionManager.setInError(modPow.children[1], "Exponent must be an integer, non-negative number");
		throw new ReductionError();
	}
	
	let m = modPow.children[2].get("Value");
	if (!CanonicalArithmetic.isInteger(m) || m.isNegative()) {
		ReductionManager.setInError(modPow.children[2], "Modulo must be an integer, non-negative number");
		throw new ReductionError();
	}
	
	let r;
	let zero = CanonicalArithmetic.getIntegerZero(session);
	let one = CanonicalArithmetic.getIntegerOne(session);
	let two = CanonicalArithmetic.createInteger(2, session);
	
	if (m.comparedTo(one) === 0) {
		r = zero;
	}
	else {
		r = one;
		b = CanonicalArithmetic.divMod(b, m, false, true, session);
		
		while (e.isPositive()) {
			if (CanonicalArithmetic.divMod(e, two, false, true, session).comparedTo(one) === 0) {
				r = CanonicalArithmetic.divMod(r.multiplication(b), m, false, true, session);
			}
			
			b = CanonicalArithmetic.divMod(b.multiplication(b), m, false, true, session);
			e = e.integerDivision(two, session);
		}
	}
	
	modPow.replaceBy(CanonicalArithmetic.createInternalNumber(r, session));
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
	if (!CanonicalArithmetic.isInteger(a) || a.isNegative()) {
		ReductionManager.setInError(modInverse.children[0], "Expression must be an non-negative integer");
		throw new ReductionError();
	}
	
	let m = modInverse.children[1].get("Value");
	if (!CanonicalArithmetic.isInteger(m) || m.isNegative()) {
		ReductionManager.setInError(modInverse.children[1], "Modulo must be an integer, non-negative number");
		throw new ReductionError();
	}
	
	let zero = CanonicalArithmetic.getIntegerZero(session);
	let one = CanonicalArithmetic.getIntegerOne(session);
	
	let t = zero, newt = one;
	let r = m,    newr = a;
	let quotient;
	let tmp;
	
	while (newr.comparedTo(zero) !== 0) {
		quotient = r.integerDivision(newr, session);
		
		[ newt, t ] = [ t.addition(quotient.multiplication(newt).negation()), newt ];
		[ newr, r ] = [ r.addition(quotient.multiplication(newr).negation()), newr ];
	}
	
	if (r.comparedTo(one) > 0) {
		ReductionManager.setInError(modInverse.children[0], "Number is not invertible in such that base");
		throw new ReductionError();
	}
	
	if (t.comparedTo(zero) < 0) {
		t = t.addition(m);
	}
	
	modInverse.replaceBy(CanonicalArithmetic.createInternalNumber(t, session));
	return true;
};

Arithmetic.log = async (log, session) => {
	if (!log.children[0].isInternalNumber()) return false;
	
	let x = log.children[0].get("Value");
	
	// one (logarithm is zero)
	
	if (x.isOne()) {
		log.replaceBy(
			CanonicalArithmetic.createInternalNumber(
				CanonicalArithmetic.isInteger(x) ?
				CanonicalArithmetic.getIntegerZero(session) :
				CanonicalArithmetic.getDecimalZero(session),
				session
			)
		);
		return true;
	}
	
	if (x.isZero()) {
		log.replaceBy(
			Formulae.createExpression(
				"Math.Arithmetic.Negative",
				Formulae.createExpression("Math.Infinity")
			)
		);
		return true;
	}
	
	let result;
	arg: {
		// integer or rational
		
		if (CanonicalArithmetic.isInteger(x) || CanonicalArithmetic.isRational(x)) {
			if (session.numeric) {
				x = x.toDecimal(session);
			}
			else {
				return false; // forward to other forms of log()
			}
		}
		
		// decimal
		
		if (CanonicalArithmetic.isDecimal(x)) {
			if (x.isPositive()) {
				result = CanonicalArithmetic.createInternalNumber(x.naturalLogarithm(session), session);
			}
			else {
				result = CanonicalArithmetic.createInternalNumber(
					CanonicalArithmetic.createComplex(
						x.negation().naturalLogarithm(session),
						CanonicalArithmetic.getPi(session)
					),
					session
				);
			}
			break arg;
		}
		
		// complex
		
		if (CanonicalArithmetic.isDecimal(x.real) || CanonicalArithmetic.isDecimal(x.imaginary)) { // numeric
			let imaginary = x.imaginary.toDecimal(session).aTan2(x.real.toDecimal(session), session);
			
			if (x.real.isZero()) {
				result = CanonicalArithmetic.createInternalNumber(
					CanonicalArithmetic.createComplex(
						x.imaginary.absoluteValue().naturalLogarithm(session),
						imaginary
					),
					session
				);
			}
			else {
				result = CanonicalArithmetic.createInternalNumber(
					CanonicalArithmetic.createComplex(
						CanonicalArithmetic.addition(
							x.real.multiplication(x.real, session),
							x.imaginary.multiplication(x.imaginary, session),
							session
						).squareRoot(session).naturalLogarithm(session),
						imaginary
					),
					session
				);
			}
		}
		else { // symbolic
			if (x.real.isZero()) {
				result = Formulae.createExpression(
					"Math.Arithmetic.Addition",
					Formulae.createExpression(
						"Math.Transcendental.NaturalLogarithm",
						CanonicalArithmetic.createInternalNumber(
							x.imaginary.absoluteValue(),
							session
						)
					),
					Formulae.createExpression(
						"Math.Arithmetic.Multiplication",
						CanonicalArithmetic.createInternalNumber(
							CanonicalArithmetic.createRational(
								CanonicalArithmetic.createInteger(x.imaginary.isPositive() ? 1 : -1, session),
								CanonicalArithmetic.createInteger(2, session)
							),
							session
						),
						Formulae.createExpression("Math.Constant.Pi"),
						Formulae.createExpression("Math.Complex.ImaginaryUnit")
					)
				);
			}
			else {
				result = Formulae.createExpression(
					"Math.Arithmetic.Addition",
					Formulae.createExpression(
						"Math.Transcendental.NaturalLogarithm",
						Formulae.createExpression(
							"Math.Arithmetic.SquareRoot",
							CanonicalArithmetic.createInternalNumber(
								CanonicalArithmetic.addition(
									x.real.multiplication(x.real, session),
									x.imaginary.multiplication(x.imaginary, session),
									session
								),
								session
							)
						)
					),
					Formulae.createExpression(
						"Math.Arithmetic.Multiplication",
						Formulae.createExpression(
							"Math.Trigonometric.ArcTangent2",
							CanonicalArithmetic.createInternalNumber(x.imaginary, session),
							CanonicalArithmetic.createInternalNumber(x.real, session)
						),
						Formulae.createExpression("Math.Complex.ImaginaryUnit")
					)
				);
			}
		}
	}
	
	// base
	
	base: {
		let tag = log.getTag();
		
		if (tag === "Math.Transcendental.DecimalLogarithm") {
			if (result.isInternalNumber()) {
				result.set(
					"Value",
					CanonicalArithmetic.division(
						result.get("Value"),
						CanonicalArithmetic.getLN10(session),
						session
					)
				);
			}
			else {
				result = Formulae.createExpression(
					"Math.Arithmetic.Division",
					result,
					Formulae.createExpression(
						"Math.Transcendental.NaturalLogarithm",
						CanonicalArithmetic.createInternalNumber(
							CanonicalArithmetic.createInteger(10, session),
							session
						)
					)
				);
			}
			
			break base;
		}
		
		if (tag === "Math.Transcendental.BinaryLogarithm") {
			if (result.isInternalNumber()) {
				result.set(
					"Value",
					CanonicalArithmetic.division(
						result.get("Value"),
						CanonicalArithmetic.getLN2(session),
						session
					)
				);
			}
			else {
				result = Formulae.createExpression(
					"Math.Arithmetic.Division",
					result,
					Formulae.createExpression(
						"Math.Transcendental.NaturalLogarithm",
						CanonicalArithmetic.createInternalNumber(
							CanonicalArithmetic.createInteger(2, session),
							session
						)
					)
				);
			}
			
			break base;
		}
		
		if (log.children.length >= 2) {
			result = Formulae.createExpression(
				"Math.Arithmetic.Division",
				result,
				Formulae.createExpression(
					"Math.Transcendental.NaturalLogarithm",
					log.children[1]
				)
			);
			
			break base;
		}
	}
	
	// finally
	
	log.replaceBy(result);
	
	if (!result.isInternalNumber()) {
		await session.reduce(result);
	}
	
	return true;
};

Arithmetic.sqrt = async (sqrt, session) => {
	let expr = sqrt.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	if (CanonicalArithmetic.isInteger(n)) {
		let isNegative = n.isNegative();
		if (n.isNegative()) n = n.negation();
		
		let sr = n.sqrtInteger();
		
		if (sr === undefined) {
			if (isNegative) {
				expr.set("Value", n);
				let mult = Formulae.createExpression(
					"Math.Arithmetic.Multiplication",
					Formulae.createExpression("Math.Complex.ImaginaryUnit")
				);
				sqrt.replaceBy(mult);
				mult.addChildAt(0, sqrt);
				return true;
			}
			else {
				return false;
			}
		}
		else {
			if (isNegative) {
				sqrt.replaceBy(
					CanonicalArithmetic.createInternalNumber(
						CanonicalArithmetic.createComplex(
							CanonicalArithmetic.getIntegerZero(session),
							sr
						),
						session
					)
				);
				return true;
			}
			else {
				sqrt.replaceBy(CanonicalArithmetic.createInternalNumber(sr, session));
				return true;
			}
		}
	}
	
	let sr;
	try {
		sr = CanonicalArithmetic.exponentiation(
			n,
			CanonicalArithmetic.createRational(
				CanonicalArithmetic.createInteger(1, session),
				CanonicalArithmetic.createInteger(2, session)
			),
			session
		);
	}
	catch (error) {
		if (error instanceof CanonicalArithmetic.NonNumericError) {
			return false;
		}
		else {
			throw error;
		}
	}
	
	expr.set("Value", sr);
	sqrt.replaceBy(expr);
	return true;
}

const trigHyperMap = new Map();
trigHyperMap.set("Math.Trigonometric.Sine",         CanonicalArithmetic.sine);
trigHyperMap.set("Math.Trigonometric.Cosine",       CanonicalArithmetic.cosine);
trigHyperMap.set("Math.Trigonometric.Tangent",      CanonicalArithmetic.tangent);
trigHyperMap.set("Math.Trigonometric.Cotangent",    CanonicalArithmetic.cotangent);
trigHyperMap.set("Math.Trigonometric.Secant",       CanonicalArithmetic.secant);
trigHyperMap.set("Math.Trigonometric.Cosecant",     CanonicalArithmetic.cosecant);
trigHyperMap.set("Math.Trigonometric.ArcSine",      CanonicalArithmetic.inverseSine);
trigHyperMap.set("Math.Trigonometric.ArcCosine",    CanonicalArithmetic.inverseCosine);
trigHyperMap.set("Math.Trigonometric.ArcTangent",   CanonicalArithmetic.inverseTangent);
trigHyperMap.set("Math.Trigonometric.ArcCotangent", CanonicalArithmetic.inverseCotangent);
trigHyperMap.set("Math.Trigonometric.ArcSecant",    CanonicalArithmetic.inverseSecant);
trigHyperMap.set("Math.Trigonometric.ArcCosecant",  CanonicalArithmetic.inverseCosecant);
trigHyperMap.set("Math.Hyperbolic.Sine",            CanonicalArithmetic.hyperbolicSine);
trigHyperMap.set("Math.Hyperbolic.Cosine",          CanonicalArithmetic.hyperbolicCosine);
trigHyperMap.set("Math.Hyperbolic.Tangent",         CanonicalArithmetic.hyperbolicTangent);
trigHyperMap.set("Math.Hyperbolic.Cotangent",       CanonicalArithmetic.hyperbolicCotangent);
trigHyperMap.set("Math.Hyperbolic.Secant",          CanonicalArithmetic.hyperbolicSecant);
trigHyperMap.set("Math.Hyperbolic.Cosecant",        CanonicalArithmetic.hyperbolicCosecant);
trigHyperMap.set("Math.Hyperbolic.ArcSine",         CanonicalArithmetic.inverseHyperbolicSine);
trigHyperMap.set("Math.Hyperbolic.ArcCosine",       CanonicalArithmetic.inverseHyperbolicCosine);
trigHyperMap.set("Math.Hyperbolic.ArcTangent",      CanonicalArithmetic.inverseHyperbolicTangent);
trigHyperMap.set("Math.Hyperbolic.ArcCotangent",    CanonicalArithmetic.inverseHyperbolicCotangent);
trigHyperMap.set("Math.Hyperbolic.ArcSecant",       CanonicalArithmetic.inverseHyperbolicSecant);
trigHyperMap.set("Math.Hyperbolic.ArcCosecant",     CanonicalArithmetic.inverseHyperbolicCosecant);

Arithmetic.trigHyper = async (f, session) => {
	let expr = f.children[0];
	
	if (!expr.isInternalNumber()) return false;
	let x = expr.get("Value");
	
	if (session.numeric || session.noSymbolic) {
		x = x.toDecimal(session);
	}
	else {
		if (CanonicalArithmetic.isInteger(x) || CanonicalArithmetic.isRational(x)) {
			return false; // forward
		}
		
		if (CanonicalArithmetic.isComplex(x)) {
			if (CanonicalArithmetic.isDecimal(x.real) || CanonicalArithmetic.isDecimal(x.imaginary)) {
				x = x.toDecimal(session);
			}	
			else {
				return false; // forward
			}
		}
	}
	
	let r;
	try {
		r = trigHyperMap.get(f.getTag())(x, session);
	}
	catch (error) {
		if (error instanceof CanonicalArithmetic.NonNumericError) {
			return false;
		}
		else if (
			error instanceof CanonicalArithmetic.OverflowError ||
			error instanceof CanonicalArithmetic.UnderflowError ||
			error instanceof CanonicalArithmetic.DomainError
		) {
			f.replaceBy(Formulae.createExpression("Undefined"));
			return true;
		}
		else {
			throw error;
		}
	}
	
	expr.set("Value", r);
	f.replaceBy(expr);
	return true;
};

Arithmetic.atan2 = async (atan2, session) => {
	if (!atan2.children[0].isInternalNumber()) return false;
	let numbery = atan2.children[0].get("Value");
	if (CanonicalArithmetic.isComplex(numbery)) return false;
	
	if (!atan2.children[1].isInternalNumber()) return false;
	let numberx = atan2.children[1].get("Value");
	if (CanonicalArithmetic.isComplex(numberx)) return false;
	
	/////////////
	// numeric //
	/////////////
	
	if (session.numeric || CanonicalArithmetic.isDecimal(numbery) || CanonicalArithmetic.isDecimal(numberx)) {
		numbery = CanonicalArithmetic.toDecimal(numbery, session);
		numberx = CanonicalArithmetic.toDecimal(numberx, session);
		
		try {
			atan2.replaceBy(
				CanonicalArithmetic.createInternalNumber(
					numbery.aTan2(numberx, session),
					session
				)
			);
			return true;
		}
		catch (e) {
			if (e instanceof CanonicalArithmetic.DivisionByZeroError) {
				atan2.replaceBy(Formulae.createExpression("Undefined"));
				return true;
			}
			
			throw e;
		}
	}
	
	//////////////
	// symbolic //
	//////////////
	
	if (numbery.isZero()) {
		if (numberx.isPositive()) {
			atan2.replaceBy(
				CanonicalArithmetic.createInternalNumber(
					CanonicalArithmetic.getIntegerZero(session),
					session
				)
			);
		}
		else if (numberx.isNegative()) {
			atan2.replaceBy(
				Formulae.createExpression("Math.Constant.Pi")
			);
		}
		else { // zero
			atan2.replaceBy(
				Formulae.createExpression("Undefined")
			);
		}
		
		return true;
	}
	
	if (numberx.isZero()) {
		if (numbery.isPositive()) {
			atan2.replaceBy(
				Formulae.createExpression(
					"Math.Arithmetic.Multiplication",
					CanonicalArithmetic.createInternalNumber(
						CanonicalArithmetic.createRational(
							CanonicalArithmetic.getIntegerOne(session),
							CanonicalArithmetic.createInteger(2, session)
						),
						session
					),
					Formulae.createExpression("Math.Constant.Pi")
				)
			);
		}
		else { // negative
			atan2.replaceBy(
				Formulae.createExpression(
					"Math.Arithmetic.Multiplication",
					CanonicalArithmetic.createInternalNumber(
						CanonicalArithmetic.createRational(
							CanonicalArithmetic.getIntegerOne(session),
							CanonicalArithmetic.createInteger(-2, session)
						),
						session
					),
					Formulae.createExpression("Math.Constant.Pi")
				)
			);
		}
		
		return true;
	}
	
	return false;
};

Arithmetic.integerPart = async (f, session) => {
	let expr = f.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	if (CanonicalArithmetic.isDecimal(n)) {
		expr.set("Value", n.absoluteValue().trunc().toInteger());
		f.replaceBy(expr);
		return true;
	}
	
	if (CanonicalArithmetic.isInteger(n)) {
		expr.set("Value", n.absoluteValue());
		f.replaceBy(expr);
		return true;
	}
	
	if (CanonicalArithmetic.isRational(n)) {
		expr.set("Value", n.numerator.absoluteValue().integerDivisionForGCD(n.denominator));
		f.replaceBy(expr);
		return true;
	}
	
	if (CanonicalArithmetic.isComplex(n)) {
		return false;
	}
};

Arithmetic.fractionalPart = async (f, session) => {
	let expr = f.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	if (CanonicalArithmetic.isDecimal(n)) {
		n = n.absoluteValue();
		expr.set("Value", n.addition(n.trunc().negation(), session));
		f.replaceBy(expr);
		return true;
	}
	
	if (CanonicalArithmetic.isInteger(n)) {
		expr.set("Value", CanonicalArithmetic.getDecimalZero(session));
		f.replaceBy(expr);
		return true;
	}
	
	if (CanonicalArithmetic.isRational(n)) {
		n = n.absoluteValue();
		expr.set("Value", CanonicalArithmetic.subtraction(n, n.numerator.integerDivisionForGCD(n.denominator)));
		f.replaceBy(expr);
		return true;
	}
	
	if (CanonicalArithmetic.isComplex(n)) {
		return false;
	}
};

Arithmetic.isNumeric = async (isNumeric, session) => {
	isNumeric.replaceBy(Formulae.createExpression(isNumeric.children[0].isInternalNumber() ? "Logic.True" : "Logic.False"));
	return true;
};

Arithmetic.isX = async (is, session) => {
	if (!is.children[0].isInternalNumber()) return false;
	let number = is.children[0].get("Value");
	
	let result;
	
	switch (is.getTag()) {
		case "Math.Arithmetic.IsInteger":
			result = CanonicalArithmetic.isInteger(number);
			break;
			
		case "Math.Arithmetic.IsDecimal":
			result = CanonicalArithmetic.isDecimal(number);
			break;
			
		case "Math.Arithmetic.IsIntegerValue":
			result =
				CanonicalArithmetic.isInteger(number) ||
				(CanonicalArithmetic.isDecimal(number) && number.hasIntegerValue())
			;
			break;
			
		case "Math.Arithmetic.IsRealNumber":
			result = CanonicalArithmetic.isInteger(number) || CanonicalArithmetic.isDecimal(number);
			break;
			
		case "Math.Arithmetic.IsRationalNumber":
			result = CanonicalArithmetic.isRational(number);
			break;
			
		case "Math.Arithmetic.IsComplexNumber":
			result = CanonicalArithmetic.isComplex(number);
			break;
			
		case "Math.Arithmetic.IsNegativeNumber":
			result = !CanonicalArithmetic.isComplex(number) && number.isNegative();
			break;
			
		case "Math.Arithmetic.IsPositiveNumber":
			result = !CanonicalArithmetic.isComplex(number) && number.isPositive();
			break;
			
		case "Math.Arithmetic.IsNumberZero":
			result = number.isZero();
			break;
			
		case "Math.Arithmetic.IsEven": {
				let i = undefined;
				if (CanonicalArithmetic.isInteger(number)) i = number;
				else if (CanonicalArithmetic.isDecimal(number) && number.hasIntegerValue()) i = number.toInteger();
				if (i === undefined) {
					result = false;
				}
				else {
					console.log(i.integerDivisionForGCD(CanonicalArithmetic.createInteger(2, session)));
					result = i.remainder(CanonicalArithmetic.createInteger(2, session)).isZero();
				}
			}
			break;
			
		case "Math.Arithmetic.IsOdd": {
				let i = undefined;
				if (CanonicalArithmetic.isInteger(number)) i = number;
				else if (CanonicalArithmetic.isDecimal(number) && number.hasIntegerValue()) i = number.toInteger();
				if (i === undefined) {
					result = false;
				}
				else {
					result = !i.remainder(CanonicalArithmetic.createInteger(2, session)).isZero();
				}
			}
			break;
	}
	
	is.replaceBy(Formulae.createExpression(result ? "Logic.True" : "Logic.False"));
	return true;
};

Arithmetic.toX = async (to, session) => {
	let expr = to.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	let tag = to.getTag();
	let nn = null;
	
	switch (tag) {
		case "Math.Arithmetic.ToInteger":
		case "Math.Arithmetic.ToIfInteger": {
				if (CanonicalArithmetic.isDecimal(n)) {
					if (n.hasIntegerValue()) nn = n.toInteger();
				}
				else if (CanonicalArithmetic.isInteger(n)) nn = n;
				else if (CanonicalArithmetic.isComplex(n)) {
					if (n.real.hasIntegerValue() && n.imaginary.hasIntegerValue()) {
						nn = CanonicalArithmetic.createComplex(n.real.toInteger(), n.imaginary.toInteger());
					}
				}
				
				if (nn === null && tag === "Math.Arithmetic.ToInteger") { // It could not be converted to integer
					ReductionManager.setInError(expr, "Number cannot be converted to integer");
					throw new ReductionError();
				}
			}
			break;
			
		case "Math.Arithmetic.ToDecimal":
			nn = n.toDecimal(session);
			break;
	}
	
	if (nn === null) {
		to.replaceBy(expr);
	}
	else {
		to.replaceBy(CanonicalArithmetic.createInternalNumber(nn, session));
	}
	
	return true;
};

Arithmetic.toNumber = async (toNumber, session) => {
	let arg = toNumber.children[0];
	if (arg.getTag() !== "String.String") return false;
	let s = arg.get("Value");
	
	let base = 10;
	if (toNumber.children.length >= 2) {
		base = CanonicalArithmetic.getNativeInteger(toNumber.children[1]);
		if (base === undefined) return false;
		if (base < 2 || base > 36) return false;
	}
	
	if (base === 10) {
		let result = s.match(/[-]?[0-9]+[.]?[0-9]*/);
		if (result === null || result[0] !== s) return false;
		let point = s.indexOf(".") >= 0;
		
		try {
			toNumber.replaceBy(
				CanonicalArithmetic.createInternalNumber(
					point ?
					CanonicalArithmetic.createDecimalFromString(s, session) :
					CanonicalArithmetic.createIntegerFromString(s, session),
					session
				)
			);
		}
		catch (error) {
			if (error instanceof CanonicalArithmetic.ConversionError) {
				return false;
			}
		}
		
		return true;
	}
	else {
		let b = base;
		
		let hasDecimalPoint = s.indexOf(".") >= 0;
		let number, fraction;
		
		if (hasDecimalPoint) {
			base = CanonicalArithmetic.createDecimal(base, session);
			number = CanonicalArithmetic.getDecimalZero(session);
			fraction = CanonicalArithmetic.getDecimalOne(session);
		}
		else {
			base = CanonicalArithmetic.createInteger(base, session);
			number = CanonicalArithmetic.getIntegerZero(session);
		}
		
		// 0-9 48-57
		// a-z 97-122
		// A-Z 65-90
		//  -  45
		//  .  46
		
		let cp;
		let i = 0;
		let point = false;
		//let number = new session.Decimal(0);
		//let fraction = new session.Decimal(1);
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
  			if (cp >= 48 && cp <= 47 + b) {
				cp -= 48;
			}
			else if (cp >= 65 && cp <= 55 + b) {
				cp -= 55;
			}
			else if (cp >= 97 && cp <= 87 + b) {
				cp -= 87;
			}
			else {
				return false;
			}
			
			// ok
			if (!point) {
				//number = session.Decimal.add(session.Decimal.mul(number, base), cp);
				number = number.multiplication(base, session).addition(
					hasDecimalPoint ? CanonicalArithmetic.createDecimal(cp, session) : CanonicalArithmetic.createInteger(cp, session),
					session
				);
			}
			else {
				//fraction = session.Decimal.div(fraction, base);
				//number = session.Decimal.add(number, session.Decimal.mul(fraction, cp));
				fraction = fraction.division(base, session);
				number = number.addition(
					fraction.multiplication(
						hasDecimalPoint ? CanonicalArithmetic.createDecimal(cp, session) : CanonicalArithmetic.reateInteger(cp, session),
						session
					),
					session
				);
			}
  			
  			++i;
  		}
		
  		if (i == 0) return false;
		if (negative) number = number.negation();
		
		toNumber.replaceBy(CanonicalArithmetic.createInternalNumber(number, session));
		
		return true;
	}
};

Arithmetic.factorial = async (factorial, session) => {
	let number = CanonicalArithmetic.getNativeInteger(factorial.children[0]);
	if (number === undefined || number < 0n) return false;
	number = CanonicalArithmetic.createInteger(number, session);
	
	let one = CanonicalArithmetic.getIntegerOne(session);
	
	let result = one;
	for (let i = CanonicalArithmetic.createInteger(2, session); i.comparedTo(number) <= 0; i = i.addition(one)) {
		result = result.multiplication(i);
	}
	
	factorial.replaceBy(CanonicalArithmetic.createInternalNumber(result, session));
	
	return true;
};

Arithmetic.toString = async (toString, session) => {
	if (!toString.children[0].isInternalNumber()) return false;
	let number = toString.children[0].get("Value");
	
	let base = 10;
	if (toString.children.length >= 2) {
		base = CanonicalArithmetic.getNativeInteger(toString.children[1]);
		if (base === undefined) return false;
	}
	
	if (base == 10) {
		if (CanonicalArithmetic.isInteger(number) || CanonicalArithmetic.isDecimal(number)) {
			let expr = Formulae.createExpression("String.String");
			expr.set("Value", number.toText());
			toString.replaceBy(expr);
			return true;
		}
	}
	
	return false;
};

Arithmetic.digits = async (digits, session) => {
	if (!digits.children[0].isInternalNumber()) return false;
	let number = digits.children[0].get("Value");
	if (!CanonicalArithmetic.isInteger(number)) return false;
	if (number.isNegative()) return false;
	
	let base = 10;
	if (digits.children.length >= 2) {
		base = CanonicalArithmetic.getNativeInteger(digits.children[1]);
		if (base === undefined || base < 2 ) return false;
	}
	base = CanonicalArithmetic.createInteger(base, session);
	
	let expr = Formulae.createExpression("List.List");
	let quotient = number;
	let remainder;
	
	do {
		remainder = quotient.remainder(base);
		quotient = quotient.integerDivisionForGCD(base);
		expr.addChildAt(0, CanonicalArithmetic.createInternalNumber(remainder, session));
	} while (!quotient.isZero());
	
	if (digits.children.length >= 3) {
		let size = CanonicalArithmetic.getNativeInteger(digits.children[2]);
		if (size === undefined || base < 1 ) return false;
		if (size > expr.children.length) {
			let zero = CanonicalArithmetic.getIntegerZero(session);
			for (let i = 0, n = size - expr.children.length; i < n; ++i) {
				expr.addChildAt(0, CanonicalArithmetic.createInternalNumber(zero, session));
			}
		}
	}
	
	digits.replaceBy(expr);
	return true;
};

Arithmetic.toTime = async (toTime, session) => {
	let number = CanonicalArithmetic.getNativeInteger(toTime.children[0]);
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
		pivot = list.children[pos];
		if (!pivot.isInternalNumber()) continue;
		pivot = pivot.get("Value");
		if (pivot.hasIntegerValue()) {
			if (!CanonicalArithmetic.isInteger(pivot)) pivot = pivot.toInteger(session);
			break;
		}
	}
	
	if (pos >= n) return false; // there was no numeric, integer addends
	
	// there was a numeric child, index is (pos)
	let sibling;
	let performed = false;
	let r = pivot;
	
	for (let i = n - 1; i > pos; --i) {
		sibling = list.children[i];
		if (!sibling.isInternalNumber()) continue;
		sibling = sibling.get("Value");
		
		if (sibling.hasIntegerValue()) {
			if (!CanonicalArithmetic.isInteger(sibling)) sibling = sibling.toInteger(session);
			if (isGcd) {
				r = r.gcd(sibling);
			}
			else {   // LCM(a, b) = | ab | / GCD(a, b)
				//r = CanonicalArithmetic.abs(r * sibling) / CanonicalArithmetic.gcd(r, sibling);
				r = r.multiplication(sibling).absoluteValue().integerDivisionForGCD(r.gcd(sibling));
			}
			
			list.removeChildAt(i);
			performed = true;
		}
	}
		
	if (list.children.length == 1) { // just one child
		gcdLcm.replaceBy(CanonicalArithmetic.createInternalNumber(r, session));
		return true;
	}
	else { // more than one child
		if (pos == 0) {
			if (performed) {
				list.setChild(0, CanonicalArithmetic.createInternalNumber(r, session));
			}
		}
		else {
			list.removeChildAt(pos);
			list.addChildAt(0, CanonicalArithmetic.createInternalNumber(r, session));
			//performed = true;
		}
	}
	
	return false; // Ok, forward to other forms of GCD/LCM(...)
};

Arithmetic.factors = async (factors, session) => {
	let n = factors.children[0];
	if (!n.isInternalNumber()) return false;
	n = n.get("Value");
	if (!n.hasIntegerValue()) return false;
	if (!CanonicalArithmetic.isInteger(n)) n = n.toInteger(session);
	if (!n.isPositive()) return false;
	
	let one = CanonicalArithmetic.getIntegerOne(session);
	let two = CanonicalArithmetic.createInteger(2, session);
	let three = CanonicalArithmetic.createInteger(3, session);
	
	let list = Formulae.createExpression("List.List");
	
	while (n.remainder(two).isZero()) {
		list.addChild(CanonicalArithmetic.createInternalNumber(two, session));
		n = n.integerDivisionForGCD(two);
	}
	
	if (n.comparedTo(one) > 0) {
		let f = three;
		
		while (f.multiplication(f).comparedTo(n) <= 0) {
			if (n.remainder(f).isZero()) {
				list.addChild(CanonicalArithmetic.createInternalNumber(f, session));
				n = n.integerDivisionForGCD(f);
			}
			else {
				f = f.addition(two);
			}
		}
		
		list.addChild(CanonicalArithmetic.createInternalNumber(n, session));
	}
	
	factors.replaceBy(list);
	return true;
};

Arithmetic.divisionTest = async (divisionTest, session) => {
	let divisor = CanonicalArithmetic.getInteger(divisionTest.children[0]);
	if (divisor === undefined || divisor.isZero()) return false;
	
	let multiple = CanonicalArithmetic.getInteger(divisionTest.children[1]);
	if (multiple === undefined) return false;
	
	let divides = multiple.remainder(divisor).isZero();
	
	if (divisionTest.getTag() === "Math.Arithmetic.DoesNotDivide") {
		divides = !divides;
	}
	
	divisionTest.replaceBy(Formulae.createExpression(divides ? "Logic.True" : "Logic.False"));
	return true;
	
	/*
	let divisor = CanonicalArithmetic.getBigInt(divisionTest.children[0]);
	if (divisor === undefined || divisor === 0n) return false;
	
	let multiple = CanonicalArithmetic.getBigInt(divisionTest.children[1]);
	if (multiple === undefined) return false;
	
	// DO NOT remove the part
	// + 0n
	// It causes closure compiler to behave bad !!! 
	
	let rem = (multiple % divisor) + 0n;
	let divides = rem == 0n;
	
	if (divisionTest.getTag() === "Math.Arithmetic.DoesNotDivide") {
		divides = !divides;
	}
	
	divisionTest.replaceBy(Formulae.createExpression(divides ? "Logic.True" : "Logic.False"));
	return true;
	*/
};

Arithmetic.random = (random, session) => {
	let precision = -1;
	if (random.children.length >= 1) {
		precision = CanonicalArithmetic.getNativeInteger(random.children[0]);
		if (precision === undefined || precision <= 0) return false;
	}
	
	random.replaceBy(CanonicalArithmetic.createInternalNumber(
		CanonicalArithmetic.getRandom(precision, session),
		session
	));
	
	return true;
};

Arithmetic.randomInRange = async (randomInRange, session) => {
	let n1 = CanonicalArithmetic.getNativeInteger(randomInRange.children[0]);
	if (n1 === undefined) return false;
	
	let n2 = CanonicalArithmetic.getNativeInteger(randomInRange.children[1]);
	if (n2 === undefined) return false;
	
	if (n1 == n2) return false;

	let x = Math.min(n1, n2) + Math.trunc(Math.random() * (Math.abs(n2 - n1) + 1));
	
	randomInRange.replaceBy(CanonicalArithmetic.createInternalNumber(
		CanonicalArithmetic.createInteger(x, session),
		session
	));
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


Arithmetic.constant = async (c, session) => {
	if (session.numeric || session.noSymbolic) {
		let r;
		switch (c.getTag()) {
			case "Math.Constant.Pi":
				r = CanonicalArithmetic.getPi(session);
				break;
			
			case "Math.Constant.Euler":
				r = CanonicalArithmetic.getE(session);
				break;
		}
		
		c.replaceBy(CanonicalArithmetic.createInternalNumber(r, session));
	}
	
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
			if (CanonicalArithmetic.isComplex(from)) return false;
		}
		else {
			from = CanonicalArithmetic.getIntegerOne(session);
		}
		
		// to
		if (!summationProduct.children[n == 3 ? 2 : 3].isInternalNumber()) return false;
		let to = summationProduct.children[n == 3 ? 2 : 3].get("Value");
		if (CanonicalArithmetic.isComplex(to)) return false;
		
		// step
		let step;
		if (n == 5) {
			if (!summationProduct.children[4].isInternalNumber()) return false;
			step = summationProduct.children[4].get("Value");
			if (CanonicalArithmetic.isComplex(step)) return false;
		}
		else {
			step = CanonicalArithmetic.getIntegerOne(session);
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
				if (CanonicalArithmetic.comparison(from, to, session) < 0) {
					break filling;
				}
			}
			else {
				if (CanonicalArithmetic.comparison(from, to, session) > 0) {
					break filling;
				}
			}
			
			scopeEntry.setValue(CanonicalArithmetic.createInternalNumber(from, session));
			
			result.addChild(clone = arg.clone());
			//session.log("Element created");
			
			await session.reduce(clone);
			
			from = CanonicalArithmetic.addition(from, step, session);
		}
		
		result.removeScope();
	}
	
	if ((n = result.children.length) == 0) {
		result.replaceBy(
			CanonicalArithmetic.createInternalNumber(
				summation ? CanonicalArithmetic.getIntegerZero(session) : CanonicalArithmetic.getIntegerOne(session),
				session
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
			CanonicalArithmetic.createInternalNumber(
				summation ? CanonicalArithmetic.getIntegerZero(session) : CanonicalArithmetic.getIntegerOne(session),
				session
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
	given b, e, m: Integers
	returns (b ^ e) mod m
 */


Arithmetic.modularExponentiationNumeric = (x, y, p, session) => {
	// Initialize result
	
	let two = CanonicalArithmetic.createInteger(2, session);
	let res = CanonicalArithmetic.getIntegerOne(session);
	
	// Update x if it is greater than or equal to p
	x = x.remainder(p);
	while (y.isPositive()) {
		// If y is odd, multiply
		// x with result
		if (!y.remainder(two).isZero()) {
			res = res.multiplication(x).remainder(p);
		}
		
		// y must be even now
		y = y.integerDivisionForGCD(two); // y = y/2
		x = x.multiplication(x).remainder(p);
	}
	return res;
};

/**
	Miller-Rabin primality test
 */

Arithmetic.millerRabinTestNumeric = (n, d, session) => {
	let one = CanonicalArithmetic.getIntegerOne(session);
	let two = CanonicalArithmetic.createInteger(2, session);
	
	// Pick a random number in [2 .. n - 2]
	// Corner cases make sure that n > 4
	
	let a = two.randomInRange(CanonicalArithmetic.subtraction(n, two));
	
	// Compute a ^ d % n
	let x = Arithmetic.modularExponentiationNumeric(a, d, n, session);
	
	if (x.isOne() || x.comparedTo(CanonicalArithmetic.subtraction(n, one)) === 0) {
		return true;
	}
	
	// Keep squaring x while one of the following doesn't happen
	// (a) d does not reach n - 1
	// (b) (x ^ 2) % n is not 1
	// (c) (x ^ 2) % n is not n - 1
	
	while (d.comparedTo(CanonicalArithmetic.subtraction(n, one)) !== 0) {
		x = x.multiplication(x).remainder(n);
		d = d.multiplication(two);
		
		if (x.isOne()) return false;
		if (x.comparedTo(CanonicalArithmetic.subtraction(n, one)) === 0) return true;
	}
	
	// Return composite
	return false;
};

Arithmetic.isProbablePrimeNumeric = (n, k, session) => {
	let one = CanonicalArithmetic.getIntegerOne(session);
	let two = CanonicalArithmetic.createInteger(2, session);
	
	// Corner cases
	if (n.comparedTo(one) <= 0 || n.comparedTo(CanonicalArithmetic.createInteger(4, session)) === 0) return false;
	if (n.comparedTo(CanonicalArithmetic.createInteger(3, session)) <= 0) return true;
	
	// Find r such that n =
	// 2^d * r + 1 for some r >= 1
	
	let d = CanonicalArithmetic.subtraction(n, one);
	while (d.remainder(two).isZero()) {
		d = d.integerDivisionForGCD(two);
	}
	
	// Iterate given number of 'k' times
	
	for (let i = 0; i < k; ++i) {
		if (!Arithmetic.millerRabinTestNumeric(n, d, session)) {
			return false;
		}
	}
	
	return true;
};

Arithmetic.isPrime = async (isPrime, session) => {
	if (!isPrime.children[0].isInternalNumber()) return false;
	let n = isPrime.children[0].get("Value");
	
	if (!CanonicalArithmetic.isInteger(n) || n.isNegative()) {
		ReductionManager.setInError(isPrime.children[0], "Expression must be an integer, non-negative number");
		throw new ReductionError();
	}
	
	isPrime.replaceBy(
		Formulae.createExpression(
			Arithmetic.isProbablePrimeNumeric(n, 17, session) ? "Logic.True" : "Logic.False"
		)
	);
	return true;
};

Arithmetic.setReducers = () => {
	// internal numbers
	
	ReductionManager.addReducer("Math.InternalNumber", Arithmetic.internalNumber, "Arithmetic.internalNumber");
	
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
	
	ReductionManager.addReducer("Math.Numeric", Arithmetic.numeric, "Arithmetic.numeric", { special: true });
	ReductionManager.addReducer("Math.SetNoSymbolic", Arithmetic.setNoSymbolic, "Arithmetic.setNoSymbolic");
	
	// NO NEGATIVE, acoording to internal representation
	//ReductionManager.addReducer("Math.Arithmetic.Negative",       Arithmetic.negativeNumeric,        "Arithmetic.negativeNumeric");
	
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
	
	ReductionManager.addReducer("Math.Arithmetic.IsNumeric",        Arithmetic.isNumeric, "Arithmetic.isNumeric");
	
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
	
	ReductionManager.addReducer("Math.Constant.Pi",    Arithmetic.constant, "Arithmetic.constant");
	ReductionManager.addReducer("Math.Constant.Euler", Arithmetic.constant, "Arithmetic.constant");
	
	ReductionManager.addReducer("Math.Arithmetic.Summation", Arithmetic.summationProductReducer,     "Arithmetic.summationProductReducer", { special: true });
	ReductionManager.addReducer("Math.Arithmetic.Summation", Arithmetic.summationProductListReducer, "Arithmetic.summationProductListReducer", { special: true });
	ReductionManager.addReducer("Math.Arithmetic.Product",   Arithmetic.summationProductReducer    , "Arithmetic.summationProductReducer", { special: true });
	ReductionManager.addReducer("Math.Arithmetic.Product",   Arithmetic.summationProductListReducer, "Arithmetic.summationProductListReducer", { special: true });
	
	ReductionManager.addReducer("Math.Arithmetic.IsPrime", Arithmetic.isPrime, "Arithmetic.isPrime");
};

