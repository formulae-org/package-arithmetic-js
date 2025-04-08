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

export class ArithmeticPackage extends Formulae.ReductionPackage {};

const TAG_INFINITY = "Math.Infinity";

/////////////////////
// internal number //
/////////////////////

const internalNumber = async (internalNumber, session) => {
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

const significantDigits = async (significantDigits, session) => {
	if (!significantDigits.children[0].isInternalNumber()) return false;
	
	let number = significantDigits.children[0].get("Value");
	
	try {
		significantDigits.replaceBy(
			Arithmetic.createInternalNumber(
				Arithmetic.createInteger(
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

const setPrecision = async (setPrecision, session) => {
	let precisionExpr = await session.reduceAndGet(setPrecision.children[0], 0);
	let precision = Arithmetic.getNativeInteger(precisionExpr);
	if (precision === undefined || precision < 1 || precision > 1e+9) {
		ReductionManager.setInError(precisionExpr, "Expression must be a positive integer number");
		throw new ReductionError();
	}
	
	session.Decimal.precision = precision;
	return true;
};

const getPrecision = async (getPrecision, session) => {
	getPrecision.replaceBy(
		Arithmetic.createInternalNumber(
			Arithmetic.createInteger(session.Decimal.precision, session),
			session
		)
	);
	return true;
};

const withPrecision = async (withPrecision, session) => {
	let precisionExpr = await session.reduceAndGet(withPrecision.children[1], 1);
	let precision = Arithmetic.getNativeInteger(precisionExpr);
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

const decimalPlaces = async (decimalPlaces, session) => {
	if (!decimalPlaces.children[0].isInternalNumber()) return false;
	
	let number = decimalPlaces.children[0].get("Value");
	if (Arithmetic.isRational(number) || Arithmetic.isComplex(number)) return false;
	
	decimalPlaces.replaceBy(
		Arithmetic.createInternalNumber(
			Arithmetic.createInteger(number.decimalPlaces(), session),
			session
		)
	);
	
	return true;
};

////////////////////////////////////////////////
// rounding modes and euclidean division mode //
////////////////////////////////////////////////

const arrayRoundingModes = [
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

const mapRoundingModes = new Map();
for (let i = 0, n = arrayRoundingModes.length; i < n; ++i) {
	mapRoundingModes.set(arrayRoundingModes[i], i);
};

const setRoundingMode = async (setRoundingMode, session) => {
	let tag = setRoundingMode.children[0].getTag();
	if (!tag.startsWith("Math.Arithmetic.RoundingMode.")) {
		ReductionManager.setInError(
			setRoundingMode.children[0],
			"Expression must be a rounding mode"
		);
		throw new ReductionError();
	}
	
	session.Decimal.rounding = mapRoundingModes.get(tag);
	return true;
};

const getRoundingMode = async (getRoundingMode, session) => {
	getRoundingMode.replaceBy(
		Formulae.createExpression(
			arrayRoundingModes[session.Decimal.rounding]
		)
	);
	return true;
};

const setEuclideanDivisionMode = async (setEuclideanDivisionMode, session) => {
	let tag = setEuclideanDivisionMode.children[0].getTag();
	if (!(tag.startsWith("Math.Arithmetic.RoundingMode.") || tag === "Math.Arithmetic.EuclideanMode")) {
		ReductionManager.setInError(
			setEuclideanDivisionMode.children[0],
			"Expression must be a rounding mode or the euclidean mode"
		);
		throw new ReductionError();
	}
	
	session.Decimal.modulo = mapRoundingModes.get(tag);
	return true;
};

const getEuclideanDivisionMode = async (getEuclideanDivisionMode, session) => {
	getEuclideanDivisionMode.replaceBy(
		Formulae.createExpression(
			arrayRoundingModes[session.Decimal.modulo]
		)
	);
	return true;
};

/////////////
// Numeric //
/////////////

// Numeric(expression, [precision])

const numeric = async (numeric, session) => {
	let precision = undefined;
	
	if (numeric.children.length >= 2) {
		let precisionExpr = await session.reduceAndGet(numeric.children[1], 1);
		precision = Arithmetic.getNativeInteger(precisionExpr);
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

// N(expression)

const n = async (n, session) => {
	if (n.children.length != 1) return false; // forward to N(expr, precision)
	let expr = n.children[0];
	
	if (expr.isInternalNumber()) {
		let internalNumber = expr.get("Value");
		
		if (internalNumber.type !== 1) { // it is already decimal
			expr.set("Value", internalNumber.toDecimal(session));
		}
		
		n.replaceBy(expr);
	}
	else {
		let result = Formulae.createExpression("Math.Numeric");
		n.replaceBy(result);
		result.addChild(expr);
		
		await session.reduce(result);
	}
	
	return true;
};

// N(expression, precision)

const nPrecision = async (n, session) => {
	//console.log("N(expression, precision)");
	if (n.children.length < 2) return false; // forward to N(expr)
	
	let precisionExpr = await session.reduceAndGet(n.children[1], 1);
	let precision = Arithmetic.getNativeInteger(precisionExpr);
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

const setAsNumeric = async (setAsNumeric, session) => {
	session.numeric = true;
	return true;
};

//////////////
// addition //
//////////////

const additionNumeric = async (addition, session) => {
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
			number = Arithmetic.addition(number, addition.children[i].get("Value"), session);
			addition.removeChildAt(i);
			performed = true;
		}
	}
	
	if (number.isZero()) {
		switch (addition.children.length) {
			case 1:
				addition.replaceBy(
					Arithmetic.createInternalNumber(number, session)
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
	
	let internalNumber = Arithmetic.createInternalNumber(number, session);
	
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

const multiplicationNumeric = async (multiplication, session) => {
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
			number = Arithmetic.multiplication(number, multiplication.children[i].get("Value"), session);
			multiplication.removeChildAt(i);
			performed = true;
		}
	}
	
	// Numeric result was zero
	
	if (number.isZero()) {
		multiplication.replaceBy(Arithmetic.createInternalNumber(number, session));
		return true;
	}
	
	// Numeric result was one
	
	if (number.isOne()) {
		switch (multiplication.children.length) {
			case 1:
				multiplication.replaceBy(Arithmetic.createInternalNumber(number, session));
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
	
	let internalNumber = Arithmetic.createInternalNumber(number, session);
	
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

const divisionNumerics = async (division, session) => {
	if (
		division.children[0].isInternalNumber() &&
		division.children[1].isInternalNumber()
	) {
		let n = division.children[0].get("Value");
		let d = division.children[1].get("Value");
		
		// zero denominator
		if (d.isZero()) {
			let infinity = Formulae.createExpression(TAG_INFINITY);
			
			// negative numerator
			if (n.isNegative()) {
				division.replaceBy(
					Formulae.createExpression(
						"Math.Arithmetic.Multiplication",
						Arithmetic.createInternalNumber(
							Arithmetic.createInteger(-1, session),
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
			Arithmetic.createInternalNumber(
				Arithmetic.division(n, d, session),
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

const exponentiationNumerics = async (exponentiation, session) => {
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
				if (Arithmetic.isInteger(b) && Arithmetic.isInteger(e)) { // 0 ^ 0
					result = Arithmetic.createInternalNumber(
						Arithmetic.isDecimal(b) || Arithmetic.isDecimal(e) ?
						Arithmetic.getDecimalOne(session) :
						Arithmetic.getIntegerOne(session),
						session
					);
				}
				else { // 0 ^ 0.0,   0.0 ^ 0,    0.0 ^ 0.0
					result = Formulae.createExpression("Undefined");
				}
			}
			else {
				if (Arithmetic.isComplex(e)) { // exponent is complex
					result = exponentiation.children[0];
				}
				else if (e.isPositive()) { // exponent is positive
					result = Arithmetic.createInternalNumber(
						Arithmetic.isDecimal(b) || Arithmetic.isDecimal(e) ?
						Arithmetic.getDecimalZero(session) :
						Arithmetic.getIntegerZero(session),
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
			result = Arithmetic.createInternalNumber(
				Arithmetic.exponentiation(b, e, session),
				session
			);
		}
		catch (e) {
			if (e instanceof Arithmetic.NonNumericError) {
				return false;
			}
			
			throw e;
		}
		
		exponentiation.replaceBy(result);
		return true;
	}
	
	return false; // Ok, forward to other forms of Division
};

const comparisonNumerics = async (comparisonExpression, session) => {
	if (
		!comparisonExpression.children[0].isInternalNumber() ||
		!comparisonExpression.children[1].isInternalNumber()
	) {
		return false;
	}
	
	try {
		let result = Arithmetic.comparison(
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
	return Arithmetic.multiplication(
		number,
		Arithmetic.exponentiation(
			Arithmetic.createInteger(10, session),
			Arithmetic.createInteger(n, session),
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
		
		let tenPow = Arithmetic.exponentiation(
			Arithmetic.createInteger(10, session),
			Arithmetic.createInteger(decimalPlaces, session),
			session
		);
		
		let rational = Arithmetic.createRational(
			Arithmetic.multiplication(number, tenPow, session).toInteger(session),
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
			Arithmetic.addition(number, integralPart.negation(), session),
			repeating,
			session
		);
		let divisor1 = movePointToRight(
			Arithmetic.getIntegerOne(session),
			offset,
			session
		);
		let divisor2 = movePointToRight(
			Arithmetic.addition(
				movePointToRight(
					Arithmetic.getIntegerOne(session),
					repeating,
					session
				),
				Arithmetic.createInteger(-1, session),
				session
			),
			offset,
			session,
		);
		
		session.Decimal.precision = bkpPrecision;
		
		let rational1 = Arithmetic.createRational(
			integralPart.toInteger(session),
			divisor1
		);
		let rational2 = Arithmetic.createRational(
			fractionalPart.toInteger(session),
			divisor2
		);
		
		return Arithmetic.addition(rational1, rational2, session);
	}
};

const rationalize = async (rationalize, session) => {
	if (!rationalize.children[0].isInternalNumber()) return false;
	let number = rationalize.children[0].get("Value");
	
	switch (number.type) {
		case 1: { // decimal
			let repeating = 0;
			if (rationalize.children.length >= 2) {
				repeating = Arithmetic.getNativeInteger(rationalize.children[1]);
				if (repeating === undefined || repeating < 0) return false;
			}
			
			let rational = rationalizeDecimal(number, repeating, session);
			if (rational === null) return false;
			
			rationalize.replaceBy(Arithmetic.createInternalNumber(rational, session));
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

const absNumeric = async (abs, session) => {
	if (!abs.children[0].isInternalNumber()) return false;
	let number = abs.children[0].get("Value");
	
	if (Arithmetic.isComplex(number)) {
		let result = Arithmetic.createInternalNumber(
			Arithmetic.addition(
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
			Arithmetic.createInternalNumber(number.negation(), session)
		);
	}
	else {
		abs.replaceBy(abs.children[0]);
	}
	
	return true;
};

const signNumeric = async (sign, session) => {
	if (!sign.children[0].isInternalNumber()) return false;
	let number = sign.children[0].get("Value");
	
	if (Arithmetic.isComplex(number)) return false;
	
	sign.replaceBy(
		Arithmetic.createInternalNumber(
			Arithmetic.createInteger(
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

const roundToPrecision = async (roundToPrecision, session) => {
	let expr = roundToPrecision.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	let precision = Arithmetic.getNativeInteger(roundToPrecision.children[1]);
	if (precision === undefined || precision <= 0n) return false;
	
	let roundingMode, bkpRoundingMode;
	if (roundToPrecision.children.length >= 3) {
		let tag = roundToPrecision.children[2].getTag();
		if (!tag.startsWith("Math.Arithmetic.RoundingMode.")) return false;
		roundingMode = mapRoundingModes.get(tag);
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

const roundToInteger = async (roundToInteger, session) => {
	let expr = roundToInteger.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	let roundingMode, bkpRoundingMode;
	if (roundToInteger.children.length >= 2) {
		let tag = roundToInteger.children[1].getTag();
		if (!tag.startsWith("Math.Arithmetic.RoundingMode.")) return false;
		roundingMode = mapRoundingModes.get(tag);
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

const roundToDecimalPlaces = async (roundToDecimalPlaces, session) => {
	let expr = roundToDecimalPlaces.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	let places = Arithmetic.getNativeInteger(roundToDecimalPlaces.children[1]);
	if (places === undefined) return false;
	
	let roundingMode, bkpRoundingMode;
	if (roundToDecimalPlaces.children.length >= 3) {
		let tag = roundToDecimalPlaces.children[2].getTag();
		if (!tag.startsWith("Math.Arithmetic.RoundingMode.")) return false;
		roundingMode = mapRoundingModes.get(tag);
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

const roundToMultiple = async (roundToMultiple, session) => {
	let expr = roundToMultiple.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	let multiple = roundToMultiple.children[1];
	if (!multiple.isInternalNumber()) return false;
	multiple = multiple.get("Value");
	
	if (Arithmetic.isComplex(n) || Arithmetic.isComplex(multiple)) return false;
	
	let roundingMode, bkpRoundingMode;
	if (roundToMultiple.children.length >= 3) {
		let tag = roundToMultiple.children[2].getTag();
		if (!tag.startsWith("Math.Arithmetic.RoundingMode.")) return false;
		roundingMode = mapRoundingModes.get(tag);
	}
	
	if (roundingMode !== undefined) {
		bkpRoundingMode = session.Decimal.rounding;
		session.Decimal.set({ rounding: roundingMode });
	}
	
	expr.set(
		"Value",
		Arithmetic.multiplication(Arithmetic.divMod(n, multiple, true, false, session), multiple, session)
	);
	
	if (roundingMode !== undefined) {
		session.Decimal.set({ rounding: bkpRoundingMode });
	}
	
	roundToMultiple.replaceBy(expr);
	return true;
};

const floorCeilingRoundTruncate = async (fcrt, session) => {
	let expr = fcrt.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	let places = 0;
	
	if (fcrt.children.length >= 2) { // there is decimal places
		if ((places = Arithmetic.getNativeInteger(fcrt.children[1])) === undefined) {
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
	
	fcrt.replaceBy(Arithmetic.createInternalNumber(n, session));
	return true;
};

const divMod = async (divMod, session) => {
	if (!divMod.children[0].isInternalNumber()) return false;
	let dividend = divMod.children[0].get("Value");
	
	if (!divMod.children[1].isInternalNumber()) return false;
	let divisor = divMod.children[1].get("Value");
	
	if (
		Arithmetic.isComplex(dividend) ||
		Arithmetic.isComplex(divisor)
	) return false;
	
	if (divisor.isZero()) {
		divMod.replaceBy(Formulae.createExpression("Math.Infinity"));
		return true;
	}
	
	let tag = divMod.getTag();
	let isDiv = tag.includes("Div");
	let isMod = tag.includes("Mod");
	
	let dm = Arithmetic.divMod(dividend, divisor, isDiv, isMod, session);
	
	let result;
	
	if (isDiv && isMod) {
		result = Formulae.createExpression(
			"List.List",
			Arithmetic.createInternalNumber(dm[0], session),
			Arithmetic.createInternalNumber(dm[1], session)
		);
	}
	else {
		result = Arithmetic.createInternalNumber(dm, session)
	}
	
	divMod.replaceBy(result);
	return true;
};

const modPow = async (modPow, session) => {
	if (
		!modPow.children[0].isInternalNumber() ||
		!modPow.children[1].isInternalNumber() ||
		!modPow.children[2].isInternalNumber()
	) {
		return false;
	}
	
	let b = modPow.children[0].get("Value");
	if (!Arithmetic.isInteger(b) || b.isNegative()) {
		ReductionManager.setInError(modPow.children[0], "Base must be an integer, non-negative number");
		throw new ReductionError();
	}
	
	let e = modPow.children[1].get("Value");
	if (!Arithmetic.isInteger(e) || e.isNegative()) {
		ReductionManager.setInError(modPow.children[1], "Exponent must be an integer, non-negative number");
		throw new ReductionError();
	}
	
	let m = modPow.children[2].get("Value");
	if (!Arithmetic.isInteger(m) || m.isNegative()) {
		ReductionManager.setInError(modPow.children[2], "Modulo must be an integer, non-negative number");
		throw new ReductionError();
	}
	
	let r;
	let zero = Arithmetic.getIntegerZero(session);
	let one = Arithmetic.getIntegerOne(session);
	let two = Arithmetic.createInteger(2, session);
	
	if (m.comparedTo(one) === 0) {
		r = zero;
	}
	else {
		r = one;
		b = Arithmetic.divMod(b, m, false, true, session);
		
		while (e.isPositive()) {
			if (Arithmetic.divMod(e, two, false, true, session).comparedTo(one) === 0) {
				r = Arithmetic.divMod(r.multiplication(b), m, false, true, session);
			}
			
			b = Arithmetic.divMod(b.multiplication(b), m, false, true, session);
			e = e.integerDivision(two, session);
		}
	}
	
	modPow.replaceBy(Arithmetic.createInternalNumber(r, session));
	return true;
};

const modInverse = async (modInverse, session) => {
	if (
		!modInverse.children[0].isInternalNumber() ||
		!modInverse.children[1].isInternalNumber()
	) {
		return false;
	}
	
	let a = modInverse.children[0].get("Value");
	if (!Arithmetic.isInteger(a) || a.isNegative()) {
		ReductionManager.setInError(modInverse.children[0], "Expression must be an non-negative integer");
		throw new ReductionError();
	}
	
	let m = modInverse.children[1].get("Value");
	if (!Arithmetic.isInteger(m) || m.isNegative()) {
		ReductionManager.setInError(modInverse.children[1], "Modulo must be an integer, non-negative number");
		throw new ReductionError();
	}
	
	let zero = Arithmetic.getIntegerZero(session);
	let one = Arithmetic.getIntegerOne(session);
	
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
	
	modInverse.replaceBy(Arithmetic.createInternalNumber(t, session));
	return true;
};

const log = async (log, session) => {
	if (!log.children[0].isInternalNumber()) return false;
	
	let x = log.children[0].get("Value");
	
	// one (logarithm is zero)
	
	if (x.isOne()) {
		log.replaceBy(
			Arithmetic.createInternalNumber(
				Arithmetic.isInteger(x) ?
				Arithmetic.getIntegerZero(session) :
				Arithmetic.getDecimalZero(session),
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
		
		if (Arithmetic.isInteger(x) || Arithmetic.isRational(x)) {
			if (session.numeric) {
				x = x.toDecimal(session);
			}
			else {
				return false; // forward to other forms of log()
			}
		}
		
		// decimal
		
		if (Arithmetic.isDecimal(x)) {
			if (x.isPositive()) {
				result = Arithmetic.createInternalNumber(x.naturalLogarithm(session), session);
			}
			else {
				result = Arithmetic.createInternalNumber(
					Arithmetic.createComplex(
						x.negation().naturalLogarithm(session),
						Arithmetic.getPi(session)
					),
					session
				);
			}
			break arg;
		}
		
		// complex
		
		if (Arithmetic.isDecimal(x.real) || Arithmetic.isDecimal(x.imaginary)) { // numeric
			let imaginary = x.imaginary.toDecimal(session).aTan2(x.real.toDecimal(session), session);
			
			if (x.real.isZero()) {
				result = Arithmetic.createInternalNumber(
					Arithmetic.createComplex(
						x.imaginary.absoluteValue().naturalLogarithm(session),
						imaginary
					),
					session
				);
			}
			else {
				result = Arithmetic.createInternalNumber(
					Arithmetic.createComplex(
						Arithmetic.addition(
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
						Arithmetic.createInternalNumber(
							x.imaginary.absoluteValue(),
							session
						)
					),
					Formulae.createExpression(
						"Math.Arithmetic.Multiplication",
						Arithmetic.createInternalNumber(
							Arithmetic.createRational(
								Arithmetic.createInteger(x.imaginary.isPositive() ? 1 : -1, session),
								Arithmetic.createInteger(2, session)
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
							Arithmetic.createInternalNumber(
								Arithmetic.addition(
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
							Arithmetic.createInternalNumber(x.imaginary, session),
							Arithmetic.createInternalNumber(x.real, session)
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
					Arithmetic.division(
						result.get("Value"),
						Arithmetic.getLN10(session),
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
						Arithmetic.createInternalNumber(
							Arithmetic.createInteger(10, session),
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
					Arithmetic.division(
						result.get("Value"),
						Arithmetic.getLN2(session),
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
						Arithmetic.createInternalNumber(
							Arithmetic.createInteger(2, session),
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

const sqrt = async (sqrt, session) => {
	let expr = sqrt.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	if (Arithmetic.isInteger(n)) {
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
					Arithmetic.createInternalNumber(
						Arithmetic.createComplex(
							Arithmetic.getIntegerZero(session),
							sr
						),
						session
					)
				);
				return true;
			}
			else {
				sqrt.replaceBy(Arithmetic.createInternalNumber(sr, session));
				return true;
			}
		}
	}
	
	let sr;
	try {
		sr = Arithmetic.exponentiation(
			n,
			Arithmetic.createRational(
				Arithmetic.createInteger(1, session),
				Arithmetic.createInteger(2, session)
			),
			session
		);
	}
	catch (error) {
		if (error instanceof Arithmetic.NonNumericError) {
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
trigHyperMap.set("Math.Trigonometric.Sine",         Arithmetic.sine);
trigHyperMap.set("Math.Trigonometric.Cosine",       Arithmetic.cosine);
trigHyperMap.set("Math.Trigonometric.Tangent",      Arithmetic.tangent);
trigHyperMap.set("Math.Trigonometric.Cotangent",    Arithmetic.cotangent);
trigHyperMap.set("Math.Trigonometric.Secant",       Arithmetic.secant);
trigHyperMap.set("Math.Trigonometric.Cosecant",     Arithmetic.cosecant);
trigHyperMap.set("Math.Trigonometric.ArcSine",      Arithmetic.inverseSine);
trigHyperMap.set("Math.Trigonometric.ArcCosine",    Arithmetic.inverseCosine);
trigHyperMap.set("Math.Trigonometric.ArcTangent",   Arithmetic.inverseTangent);
trigHyperMap.set("Math.Trigonometric.ArcCotangent", Arithmetic.inverseCotangent);
trigHyperMap.set("Math.Trigonometric.ArcSecant",    Arithmetic.inverseSecant);
trigHyperMap.set("Math.Trigonometric.ArcCosecant",  Arithmetic.inverseCosecant);
trigHyperMap.set("Math.Hyperbolic.Sine",            Arithmetic.hyperbolicSine);
trigHyperMap.set("Math.Hyperbolic.Cosine",          Arithmetic.hyperbolicCosine);
trigHyperMap.set("Math.Hyperbolic.Tangent",         Arithmetic.hyperbolicTangent);
trigHyperMap.set("Math.Hyperbolic.Cotangent",       Arithmetic.hyperbolicCotangent);
trigHyperMap.set("Math.Hyperbolic.Secant",          Arithmetic.hyperbolicSecant);
trigHyperMap.set("Math.Hyperbolic.Cosecant",        Arithmetic.hyperbolicCosecant);
trigHyperMap.set("Math.Hyperbolic.ArcSine",         Arithmetic.inverseHyperbolicSine);
trigHyperMap.set("Math.Hyperbolic.ArcCosine",       Arithmetic.inverseHyperbolicCosine);
trigHyperMap.set("Math.Hyperbolic.ArcTangent",      Arithmetic.inverseHyperbolicTangent);
trigHyperMap.set("Math.Hyperbolic.ArcCotangent",    Arithmetic.inverseHyperbolicCotangent);
trigHyperMap.set("Math.Hyperbolic.ArcSecant",       Arithmetic.inverseHyperbolicSecant);
trigHyperMap.set("Math.Hyperbolic.ArcCosecant",     Arithmetic.inverseHyperbolicCosecant);

const trigHyper = async (f, session) => {
	let expr = f.children[0];
	
	if (!expr.isInternalNumber()) return false;
	let x = expr.get("Value");
	
	if (session.numeric || session.noSymbolic) {
		x = x.toDecimal(session);
	}
	else {
		if (Arithmetic.isInteger(x) || Arithmetic.isRational(x)) {
			return false; // forward
		}
		
		if (Arithmetic.isComplex(x)) {
			if (Arithmetic.isDecimal(x.real) || Arithmetic.isDecimal(x.imaginary)) {
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
		if (error instanceof Arithmetic.NonNumericError) {
			return false;
		}
		else if (
			error instanceof Arithmetic.OverflowError ||
			error instanceof Arithmetic.UnderflowError ||
			error instanceof Arithmetic.DomainError
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

const atan2 = async (atan2, session) => {
	if (!atan2.children[0].isInternalNumber()) return false;
	let numbery = atan2.children[0].get("Value");
	if (Arithmetic.isComplex(numbery)) return false;
	
	if (!atan2.children[1].isInternalNumber()) return false;
	let numberx = atan2.children[1].get("Value");
	if (Arithmetic.isComplex(numberx)) return false;
	
	/////////////
	// numeric //
	/////////////
	
	if (session.numeric || Arithmetic.isDecimal(numbery) || Arithmetic.isDecimal(numberx)) {
		numbery = Arithmetic.toDecimal(numbery, session);
		numberx = Arithmetic.toDecimal(numberx, session);
		
		try {
			atan2.replaceBy(
				Arithmetic.createInternalNumber(
					numbery.aTan2(numberx, session),
					session
				)
			);
			return true;
		}
		catch (e) {
			if (e instanceof Arithmetic.DivisionByZeroError) {
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
				Arithmetic.createInternalNumber(
					Arithmetic.getIntegerZero(session),
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
					Arithmetic.createInternalNumber(
						Arithmetic.createRational(
							Arithmetic.getIntegerOne(session),
							Arithmetic.createInteger(2, session)
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
					Arithmetic.createInternalNumber(
						Arithmetic.createRational(
							Arithmetic.getIntegerOne(session),
							Arithmetic.createInteger(-2, session)
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

const integerPart = async (f, session) => {
	let expr = f.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	if (Arithmetic.isDecimal(n)) {
		expr.set("Value", n.absoluteValue().trunc().toInteger());
		f.replaceBy(expr);
		return true;
	}
	
	if (Arithmetic.isInteger(n)) {
		expr.set("Value", n.absoluteValue());
		f.replaceBy(expr);
		return true;
	}
	
	if (Arithmetic.isRational(n)) {
		expr.set("Value", n.numerator.absoluteValue().integerDivisionForGCD(n.denominator));
		f.replaceBy(expr);
		return true;
	}
	
	if (Arithmetic.isComplex(n)) {
		return false;
	}
};

const fractionalPart = async (f, session) => {
	let expr = f.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	if (Arithmetic.isDecimal(n)) {
		n = n.absoluteValue();
		expr.set("Value", n.addition(n.trunc().negation(), session));
		f.replaceBy(expr);
		return true;
	}
	
	if (Arithmetic.isInteger(n)) {
		expr.set("Value", Arithmetic.getDecimalZero(session));
		f.replaceBy(expr);
		return true;
	}
	
	if (Arithmetic.isRational(n)) {
		n = n.absoluteValue();
		expr.set("Value", Arithmetic.subtraction(n, n.numerator.integerDivisionForGCD(n.denominator)));
		f.replaceBy(expr);
		return true;
	}
	
	if (Arithmetic.isComplex(n)) {
		return false;
	}
};

const isNumeric = async (isNumeric, session) => {
	isNumeric.replaceBy(Formulae.createExpression(isNumeric.children[0].isInternalNumber() ? "Logic.True" : "Logic.False"));
	return true;
};

const isX = async (is, session) => {
	if (!is.children[0].isInternalNumber()) return false;
	let number = is.children[0].get("Value");
	
	let result;
	
	switch (is.getTag()) {
		case "Math.Arithmetic.IsInteger":
			result = Arithmetic.isInteger(number);
			break;
			
		case "Math.Arithmetic.IsDecimal":
			result = Arithmetic.isDecimal(number);
			break;
			
		case "Math.Arithmetic.IsIntegerValue":
			result =
				Arithmetic.isInteger(number) ||
				(Arithmetic.isDecimal(number) && number.hasIntegerValue())
			;
			break;
			
		case "Math.Arithmetic.IsRealNumber":
			result = Arithmetic.isInteger(number) || Arithmetic.isDecimal(number);
			break;
			
		case "Math.Arithmetic.IsRationalNumber":
			result = Arithmetic.isRational(number);
			break;
			
		case "Math.Arithmetic.IsComplexNumber":
			result = Arithmetic.isComplex(number);
			break;
			
		case "Math.Arithmetic.IsNegativeNumber":
			result = !Arithmetic.isComplex(number) && number.isNegative();
			break;
			
		case "Math.Arithmetic.IsPositiveNumber":
			result = !Arithmetic.isComplex(number) && number.isPositive();
			break;
			
		case "Math.Arithmetic.IsNumberZero":
			result = number.isZero();
			break;
			
		case "Math.Arithmetic.IsEven": {
				let i = undefined;
				if (Arithmetic.isInteger(number)) i = number;
				else if (Arithmetic.isDecimal(number) && number.hasIntegerValue()) i = number.toInteger();
				if (i === undefined) {
					result = false;
				}
				else {
					console.log(i.integerDivisionForGCD(Arithmetic.createInteger(2, session)));
					result = i.remainder(Arithmetic.createInteger(2, session)).isZero();
				}
			}
			break;
			
		case "Math.Arithmetic.IsOdd": {
				let i = undefined;
				if (Arithmetic.isInteger(number)) i = number;
				else if (Arithmetic.isDecimal(number) && number.hasIntegerValue()) i = number.toInteger();
				if (i === undefined) {
					result = false;
				}
				else {
					result = !i.remainder(Arithmetic.createInteger(2, session)).isZero();
				}
			}
			break;
	}
	
	is.replaceBy(Formulae.createExpression(result ? "Logic.True" : "Logic.False"));
	return true;
};

const toX = async (to, session) => {
	let expr = to.children[0];
	if (!expr.isInternalNumber()) return false;
	let n = expr.get("Value");
	
	let tag = to.getTag();
	let nn = null;
	
	switch (tag) {
		case "Math.Arithmetic.ToInteger":
		case "Math.Arithmetic.ToIfInteger": {
				if (Arithmetic.isDecimal(n)) {
					if (n.hasIntegerValue()) nn = n.toInteger();
				}
				else if (Arithmetic.isInteger(n)) nn = n;
				else if (Arithmetic.isComplex(n)) {
					if (n.real.hasIntegerValue() && n.imaginary.hasIntegerValue()) {
						nn = Arithmetic.createComplex(n.real.toInteger(), n.imaginary.toInteger());
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
		to.replaceBy(Arithmetic.createInternalNumber(nn, session));
	}
	
	return true;
};

const toNumber = async (toNumber, session) => {
	let arg = toNumber.children[0];
	if (arg.getTag() !== "String.String") return false;
	let s = arg.get("Value");
	
	let base = 10;
	if (toNumber.children.length >= 2) {
		base = Arithmetic.getNativeInteger(toNumber.children[1]);
		if (base === undefined) return false;
		if (base < 2 || base > 36) return false;
	}
	
	if (base === 10) {
		let result = s.match(/[-]?[0-9]+[.]?[0-9]*/);
		if (result === null || result[0] !== s) return false;
		let point = s.indexOf(".") >= 0;
		
		try {
			toNumber.replaceBy(
				Arithmetic.createInternalNumber(
					point ?
					Arithmetic.createDecimalFromString(s, session) :
					Arithmetic.createIntegerFromString(s, session),
					session
				)
			);
		}
		catch (error) {
			if (error instanceof Arithmetic.ConversionError) {
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
			base = Arithmetic.createDecimal(base, session);
			number = Arithmetic.getDecimalZero(session);
			fraction = Arithmetic.getDecimalOne(session);
		}
		else {
			base = Arithmetic.createInteger(base, session);
			number = Arithmetic.getIntegerZero(session);
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
					hasDecimalPoint ? Arithmetic.createDecimal(cp, session) : Arithmetic.createInteger(cp, session),
					session
				);
			}
			else {
				//fraction = session.Decimal.div(fraction, base);
				//number = session.Decimal.add(number, session.Decimal.mul(fraction, cp));
				fraction = fraction.division(base, session);
				number = number.addition(
					fraction.multiplication(
						hasDecimalPoint ? Arithmetic.createDecimal(cp, session) : Arithmetic.reateInteger(cp, session),
						session
					),
					session
				);
			}
			
			++i;
		}
		
		if (i == 0) return false;
		if (negative) number = number.negation();
		
		toNumber.replaceBy(Arithmetic.createInternalNumber(number, session));
		
		return true;
	}
};

const factorial = async (factorial, session) => {
	let number = Arithmetic.getNativeInteger(factorial.children[0]);
	if (number === undefined || number < 0n) return false;
	number = Arithmetic.createInteger(number, session);
	
	let one = Arithmetic.getIntegerOne(session);
	
	let result = one;
	for (let i = Arithmetic.createInteger(2, session); i.comparedTo(number) <= 0; i = i.addition(one)) {
		result = result.multiplication(i);
	}
	
	factorial.replaceBy(Arithmetic.createInternalNumber(result, session));
	
	return true;
};

const toString = async (toString, session) => {
	if (!toString.children[0].isInternalNumber()) return false;
	let number = toString.children[0].get("Value");
	
	let base = 10;
	if (toString.children.length >= 2) {
		base = Arithmetic.getNativeInteger(toString.children[1]);
		if (base === undefined) return false;
	}
	
	if (base == 10) {
		if (Arithmetic.isInteger(number) || Arithmetic.isDecimal(number)) {
			let expr = Formulae.createExpression("String.String");
			expr.set("Value", number.toText());
			toString.replaceBy(expr);
			return true;
		}
	}
	
	return false;
};

const digits = async (digits, session) => {
	if (!digits.children[0].isInternalNumber()) return false;
	let number = digits.children[0].get("Value");
	if (!Arithmetic.isInteger(number)) return false;
	if (number.isNegative()) return false;
	
	let base = 10;
	if (digits.children.length >= 2) {
		base = Arithmetic.getNativeInteger(digits.children[1]);
		if (base === undefined || base < 2 ) return false;
	}
	base = Arithmetic.createInteger(base, session);
	
	let expr = Formulae.createExpression("List.List");
	let quotient = number;
	let remainder;
	
	do {
		remainder = quotient.remainder(base);
		quotient = quotient.integerDivisionForGCD(base);
		expr.addChildAt(0, Arithmetic.createInternalNumber(remainder, session));
	} while (!quotient.isZero());
	
	if (digits.children.length >= 3) {
		let size = Arithmetic.getNativeInteger(digits.children[2]);
		if (size === undefined || base < 1 ) return false;
		if (size > expr.children.length) {
			let zero = Arithmetic.getIntegerZero(session);
			for (let i = 0, n = size - expr.children.length; i < n; ++i) {
				expr.addChildAt(0, Arithmetic.createInternalNumber(zero, session));
			}
		}
	}
	
	digits.replaceBy(expr);
	return true;
};

const toTime = async (toTime, session) => {
	let number = Arithmetic.getNativeInteger(toTime.children[0]);
	if (number === undefined) return false;
	if (number < -8_640_000_000_000_000 || number > 8_640_000_000_000_000) return false;
	
	let expr = Formulae.createExpression("Time.Time");
	expr.set("Value", number);
	toTime.replaceBy(expr);
	return true;
};

const gcdLcm = async (gcdLcm, session) => {
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
			if (!Arithmetic.isInteger(pivot)) pivot = pivot.toInteger(session);
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
			if (!Arithmetic.isInteger(sibling)) sibling = sibling.toInteger(session);
			if (isGcd) {
				r = r.gcd(sibling);
			}
			else {   // LCM(a, b) = | ab | / GCD(a, b)
				//r = Arithmetic.abs(r * sibling) / Arithmetic.gcd(r, sibling);
				r = r.multiplication(sibling).absoluteValue().integerDivisionForGCD(r.gcd(sibling));
			}
			
			list.removeChildAt(i);
			performed = true;
		}
	}
		
	if (list.children.length == 1) { // just one child
		gcdLcm.replaceBy(Arithmetic.createInternalNumber(r, session));
		return true;
	}
	else { // more than one child
		if (pos == 0) {
			if (performed) {
				list.setChild(0, Arithmetic.createInternalNumber(r, session));
			}
		}
		else {
			list.removeChildAt(pos);
			list.addChildAt(0, Arithmetic.createInternalNumber(r, session));
			//performed = true;
		}
	}
	
	return false; // Ok, forward to other forms of GCD/LCM(...)
};

// n: internal integer number
// asList: whether the result will be a list expression, or a native Map: internal number -> native number

const calculateFactors = (n, session, asList) => {
	let list, map, m;
	
	if (asList) {
		list = Formulae.createExpression("List.List");
	}
	else {
		map = new Map();
	}
	
	let one = Arithmetic.getIntegerOne(session);
	let two = Arithmetic.createInteger(2, session);
	let three = Arithmetic.createInteger(3, session);
	
	while (n.remainder(two).isZero()) {
		if (asList) {
			list.addChild(Arithmetic.createInternalNumber(two, session));
		}
		else {
			m = map.get(two);
			map.set(two, m === undefined ? 1 : m + 1);
		}
		
		n = n.integerDivisionForGCD(two);
	}
	
	if (n.comparedTo(one) > 0) {
		let f = three;
		
		while (f.multiplication(f).comparedTo(n) <= 0) {
			if (n.remainder(f).isZero()) {
				if (asList) {
					list.addChild(Arithmetic.createInternalNumber(f, session));
				}
				else {
					m = map.get(f);
					map.set(f, m === undefined ? 1 : m + 1);
				}
				
				n = n.integerDivisionForGCD(f);
			}
			else {
				f = f.addition(two);
			}
		}
		
		if (asList) {
			list.addChild(Arithmetic.createInternalNumber(n, session));
		}
		else {
			m = map.get(n);
			map.set(n, m === undefined ? 1 : m + 1);
		}
	}
	
	return asList ? list : map;
};

const factorsDivisors = async (factorsDivisors, session) => {
	let n = factorsDivisors.children[0];
	if (!n.isInternalNumber()) return false;
	n = n.get("Value");
	if (!n.hasIntegerValue()) return false;
	if (!Arithmetic.isInteger(n)) n = n.toInteger(session);
	if (!n.isPositive()) return false;
	
	////////////////////////
	
	if (n.isOne()) {
		switch (factorsDivisors.getTag()) {
			case "Math.Arithmetic.Factors":
			case "Math.Arithmetic.Divisors":
			case "Math.Arithmetic.ProperDivisors":
				factorsDivisors.replaceBy(
					Formulae.createExpression(
						"List.List",
						Arithmetic.createInternalNumber(Arithmetic.getIntegerOne(session), session)
					)
				);
				return true;
				
			case "Math.Arithmetic.FactorsWithExponents":
				factorsDivisors.replaceBy(
					Formulae.createExpression(
						"List.List",
						Formulae.createExpression(
							"List.List",
							Arithmetic.createInternalNumber(Arithmetic.getIntegerOne(session), session),
							Arithmetic.createInternalNumber(Arithmetic.getIntegerOne(session), session)
						)
					)
				);
				return true;
		}
	}
	
	switch (factorsDivisors.getTag()) {
		case "Math.Arithmetic.Factors": {
				factorsDivisors.replaceBy(calculateFactors(n, session, true));
				return true;
			}
		
		case "Math.Arithmetic.FactorsWithExponents": {
				let map = calculateFactors(n, session, false);
				let list = Formulae.createExpression("List.List");
				map.forEach((value, key) => {
					list.addChild(
						Formulae.createExpression(
							"List.List",
							Arithmetic.createInternalNumber(key, session),
							Arithmetic.createInternalNumber(Arithmetic.createInteger(value, session), session)
						)
					);
				});
				factorsDivisors.replaceBy(list);
				return true;
			}
		
		case "Math.Arithmetic.Divisors":
		case "Math.Arithmetic.ProperDivisors": {
				let list = Formulae.createExpression("List.List");
				let map = calculateFactors(n, session, false);
				let bases = Array.from(map.keys());
				let maxExponents = Array.from(map.values());
				n = bases.length;
				let indices = Array(n).fill(0);
				
				let divisor, i, m;
				
				product: while (true) {
					divisor = Arithmetic.getIntegerOne(session);
					for (i = 0; i < n; ++i) {
						if (indices[i] !== 0) {
							divisor = Arithmetic.multiplication(
								divisor,
								Arithmetic.exponentiation(bases[i], Arithmetic.createInteger(indices[i], session), session),
								session
							);
						}
					}
					list.addChild(Arithmetic.createInternalNumber(divisor, session));
					
					for (i = 0; i < n; ++i) {
						m = n - i - 1;
						
						++indices[m];
						if (indices[m] > maxExponents[m]) {
							if (m == 0) {
								break product;
							}
							indices[m] = 0;
						}
						else {
							break;
						}
					}
				}
				
				if (factorsDivisors.getTag() === "Math.Arithmetic.ProperDivisors") {
					list.removeChildAt(list.children.length - 1);
				}
				
				factorsDivisors.replaceBy(list);
				return true;
			}
	}
};

const divisionTest = async (divisionTest, session) => {
	let divisor = Arithmetic.getInteger(divisionTest.children[0]);
	if (divisor === undefined || divisor.isZero()) return false;
	
	let multiple = Arithmetic.getInteger(divisionTest.children[1]);
	if (multiple === undefined) return false;
	
	let divides = multiple.remainder(divisor).isZero();
	
	if (divisionTest.getTag() === "Math.Arithmetic.DoesNotDivide") {
		divides = !divides;
	}
	
	divisionTest.replaceBy(Formulae.createExpression(divides ? "Logic.True" : "Logic.False"));
	return true;
	
	/*
	let divisor = Arithmetic.getBigInt(divisionTest.children[0]);
	if (divisor === undefined || divisor === 0n) return false;
	
	let multiple = Arithmetic.getBigInt(divisionTest.children[1]);
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

const random = (random, session) => {
	let precision = -1;
	if (random.children.length >= 1) {
		precision = Arithmetic.getNativeInteger(random.children[0]);
		if (precision === undefined || precision <= 0) return false;
	}
	
	random.replaceBy(Arithmetic.createInternalNumber(
		Arithmetic.getRandom(precision, session),
		session
	));
	
	return true;
};

const randomInRange = async (randomInRange, session) => {
	let n1 = Arithmetic.getNativeInteger(randomInRange.children[0]);
	if (n1 === undefined) return false;
	
	let n2 = Arithmetic.getNativeInteger(randomInRange.children[1]);
	if (n2 === undefined) return false;
	
	if (n1 == n2) return false;

	let x = Math.min(n1, n2) + Math.trunc(Math.random() * (Math.abs(n2 - n1) + 1));
	
	randomInRange.replaceBy(Arithmetic.createInternalNumber(
		Arithmetic.createInteger(x, session),
		session
	));
	return true;
};

const piecewise = async (piecewise, session) => {
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


const constant = async (c, session) => {
	if (session.numeric || session.noSymbolic) {
		let r;
		switch (c.getTag()) {
			case "Math.Constant.Pi":
				r = Arithmetic.getPi(session);
				break;
			
			case "Math.Constant.Euler":
				r = Arithmetic.getE(session);
				break;
		}
		
		c.replaceBy(Arithmetic.createInternalNumber(r, session));
	}
	
	return true;
};

const nPi = async (n, session) => {
	if (n.children.length > 1 || n.children[0].getTag() !== "Math.Constant.Pi") return false;
	n.replaceBy(Arithmetic.createInternalNumber(Arithmetic.getPi(session), session));
	return true;
};

const nE = async (n, session) => {
	if (n.children.length > 1 || n.children[0].getTag() !== "Math.Constant.Euler") return false;
	n.replaceBy(Arithmetic.createInternalNumber(Arithmetic.getE(session), session));
	return true;
};

const summationProductReducer = async (summationProduct, session) => {
	let n = summationProduct.children.length;
	let summation = summationProduct.getTag() === "Math.Arithmetic.Summation";
	let result;
	
	if (n == 2) {
		let arg = await session.reduceAndGet(summationProduct.children[0], 0);
		let _N = await session.reduceAndGet(summationProduct.children[1], 1);
		
		let N = Arithmetic.getInteger(_N);
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
			if (Arithmetic.isComplex(from)) return false;
		}
		else {
			from = Arithmetic.getIntegerOne(session);
		}
		
		// to
		if (!summationProduct.children[n == 3 ? 2 : 3].isInternalNumber()) return false;
		let to = summationProduct.children[n == 3 ? 2 : 3].get("Value");
		if (Arithmetic.isComplex(to)) return false;
		
		// step
		let step;
		if (n == 5) {
			if (!summationProduct.children[4].isInternalNumber()) return false;
			step = summationProduct.children[4].get("Value");
			if (Arithmetic.isComplex(step)) return false;
		}
		else {
			step = Arithmetic.getIntegerOne(session);
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
				if (Arithmetic.comparison(from, to, session) < 0) {
					break filling;
				}
			}
			else {
				if (Arithmetic.comparison(from, to, session) > 0) {
					break filling;
				}
			}
			
			scopeEntry.setValue(Arithmetic.createInternalNumber(from, session));
			
			result.addChild(clone = arg.clone());
			//session.log("Element created");
			
			await session.reduce(clone);
			
			from = Arithmetic.addition(from, step, session);
		}
		
		result.removeScope();
	}
	
	if ((n = result.children.length) == 0) {
		result.replaceBy(
			Arithmetic.createInternalNumber(
				summation ? Arithmetic.getIntegerZero(session) : Arithmetic.getIntegerOne(session),
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

const summationProductListReducer = async (summationProduct, session) => {
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
			Arithmetic.createInternalNumber(
				summation ? Arithmetic.getIntegerZero(session) : Arithmetic.getIntegerOne(session),
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

const modularExponentiationNumeric = (x, y, p, session) => {
	// Initialize result
	
	let two = Arithmetic.createInteger(2, session);
	let res = Arithmetic.getIntegerOne(session);
	
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

const millerRabinTestNumeric = (n, d, session) => {
	let one = Arithmetic.getIntegerOne(session);
	let two = Arithmetic.createInteger(2, session);
	
	// Pick a random number in [2 .. n - 2]
	// Corner cases make sure that n > 4
	
	let a = two.randomInRange(Arithmetic.subtraction(n, two));
	
	// Compute a ^ d % n
	let x = modularExponentiationNumeric(a, d, n, session);
	
	if (x.isOne() || x.comparedTo(Arithmetic.subtraction(n, one)) === 0) {
		return true;
	}
	
	// Keep squaring x while one of the following doesn't happen
	// (a) d does not reach n - 1
	// (b) (x ^ 2) % n is not 1
	// (c) (x ^ 2) % n is not n - 1
	
	while (d.comparedTo(Arithmetic.subtraction(n, one)) !== 0) {
		x = x.multiplication(x).remainder(n);
		d = d.multiplication(two);
		
		if (x.isOne()) return false;
		if (x.comparedTo(Arithmetic.subtraction(n, one)) === 0) return true;
	}
	
	// Return composite
	return false;
};

const isProbablePrimeNumeric = (n, k, session) => {
	let one = Arithmetic.getIntegerOne(session);
	let two = Arithmetic.createInteger(2, session);
	
	// Corner cases
	if (n.comparedTo(one) <= 0 || n.comparedTo(Arithmetic.createInteger(4, session)) === 0) return false;
	if (n.comparedTo(Arithmetic.createInteger(3, session)) <= 0) return true;
	
	// Find r such that n =
	// 2^d * r + 1 for some r >= 1
	
	let d = Arithmetic.subtraction(n, one);
	while (d.remainder(two).isZero()) {
		d = d.integerDivisionForGCD(two);
	}
	
	// Iterate given number of 'k' times
	
	for (let i = 0; i < k; ++i) {
		if (!millerRabinTestNumeric(n, d, session)) {
			return false;
		}
	}
	
	return true;
};

const isPrime = async (isPrime, session) => {
	if (!isPrime.children[0].isInternalNumber()) return false;
	let n = isPrime.children[0].get("Value");
	
	if (!Arithmetic.isInteger(n) || n.isNegative()) {
		ReductionManager.setInError(isPrime.children[0], "Expression must be an integer, non-negative number");
		throw new ReductionError();
	}
	
	isPrime.replaceBy(
		Formulae.createExpression(
			isProbablePrimeNumeric(n, 17, session) ? "Logic.True" : "Logic.False"
		)
	);
	return true;
};

ArithmeticPackage.setReducers = () => {
	// internal numbers
	
	ReductionManager.addReducer("Math.InternalNumber", internalNumber, "Arithmetic.internalNumber");
	
	// precision
	
	ReductionManager.addReducer("Math.Arithmetic.SignificantDigits", significantDigits, "ArithmeticPackage.significantDigits");
	ReductionManager.addReducer("Math.Arithmetic.SetPrecision",      setPrecision,      "ArithmeticPackage.setPrecision");
	ReductionManager.addReducer("Math.Arithmetic.GetPrecision",      getPrecision,      "ArithmeticPackage.getPrecision");
	ReductionManager.addReducer("Math.Arithmetic.WithPrecision",     withPrecision,     "ArithmeticPackage.withPrecision", { special: true });
	
	// rounding mode
	
	ReductionManager.addReducer("Math.Arithmetic.SetRoundingMode", setRoundingMode, "ArithmeticPackage.setRoundingMode");
	ReductionManager.addReducer("Math.Arithmetic.GetRoundingMode", getRoundingMode, "ArithmeticPackage.getRoundingMode");
	
	ReductionManager.addReducer("Math.Arithmetic.SetEuclideanDivisionMode", setEuclideanDivisionMode, "ArithmeticPackage.setEuclideanDivisionMode");
	ReductionManager.addReducer("Math.Arithmetic.GetEuclideanDivisionMode", getEuclideanDivisionMode, "ArithmeticPackage.getEuclideanDivisionMode");
	
	// numeric
	
	ReductionManager.addReducer("Math.Numeric",      numeric,                           "ArithmeticPackage.numeric",    { special: true });
	ReductionManager.addReducer("Math.N",            n,                                 "ArithmeticPackage.n");
	ReductionManager.addReducer("Math.N",            nPrecision,                        "ArithmeticPackage.nPrecision", { special: true, precedence: ReductionManager.PRECEDENCE_HIGH});
	ReductionManager.addReducer("Math.N",            nPi,                               "ArithmeticPackage.nPi");
	ReductionManager.addReducer("Math.N",            nE,                                "ArithmeticPackage.nE");
	ReductionManager.addReducer("Math.N",            ReductionManager.expansionReducer, "ReductionManager.expansion",   { precedence: ReductionManager.PRECEDENCE_LOW});
	ReductionManager.addReducer("Math.SetAsNumeric", setAsNumeric,                      "ArithmeticPackage.setAsNumeric");
	
	// NO NEGATIVES, acoording to internal representation
	//ReductionManager.addReducer("Math.Arithmetic.Negative", negativeNumeric, "ArithmeticPackage.negativeNumeric");
	
	ReductionManager.addReducer("Math.Arithmetic.Addition",       additionNumeric,        "ArithmeticPackage.additionNumeric");
	ReductionManager.addReducer("Math.Arithmetic.Multiplication", multiplicationNumeric,  "ArithmeticPackage.multiplicationNumeric");
	ReductionManager.addReducer("Math.Arithmetic.Division",       divisionNumerics,       "ArithmeticPackage.divisionNumerics");
	ReductionManager.addReducer("Math.Arithmetic.Exponentiation", exponentiationNumerics, "ArithmeticPackage.exponentiationNumerics");
	
	ReductionManager.addReducer("Relation.Compare", comparisonNumerics, "ArithmeticPackage.comparisonNumerics");
	
	ReductionManager.addReducer("Math.Arithmetic.Rationalize",   rationalize, "ArithmeticPackage.rationalize");
	ReductionManager.addReducer("Math.Arithmetic.AbsoluteValue", absNumeric,  "ArithmeticPackage.absNumeric");
	ReductionManager.addReducer("Math.Arithmetic.Sign",          signNumeric, "ArithmeticPackage.signNumeric");
	
	// rounding
	
	ReductionManager.addReducer("Math.Arithmetic.RoundToPrecision",     roundToPrecision,     "ArithmeticPackage.roundToPrecision");
	ReductionManager.addReducer("Math.Arithmetic.RoundToInteger",       roundToInteger,       "ArithmeticPackage.roundToInteger");
	ReductionManager.addReducer("Math.Arithmetic.RoundToDecimalPlaces", roundToDecimalPlaces, "ArithmeticPackage.roundToDecimalPlaces");
	ReductionManager.addReducer("Math.Arithmetic.RoundToMultiple",      roundToMultiple,      "ArithmeticPackage.roundToMultiple");
	
	ReductionManager.addReducer("Math.Arithmetic.Truncate", floorCeilingRoundTruncate, "ArithmeticPackage.floorCeilingRoundTruncate");
	ReductionManager.addReducer("Math.Arithmetic.Ceiling",  floorCeilingRoundTruncate, "ArithmeticPackage.floorCeilingRoundTruncate");
	ReductionManager.addReducer("Math.Arithmetic.Floor",    floorCeilingRoundTruncate, "ArithmeticPackage.floorCeilingRoundTruncate");
	ReductionManager.addReducer("Math.Arithmetic.Round",    floorCeilingRoundTruncate, "ArithmeticPackage.floorCeilingRoundTruncate");
	
	ReductionManager.addReducer("Math.Arithmetic.Div",    divMod, "ArithmeticPackage.divMod");
	ReductionManager.addReducer("Math.Arithmetic.Mod",    divMod, "ArithmeticPackage.divMod");
	ReductionManager.addReducer("Math.Arithmetic.DivMod", divMod, "ArithmeticPackage.divMod");
	
	ReductionManager.addReducer("Math.Arithmetic.ModularExponentiation"       , modPow,     "ArithmeticPackage.modPow");
	ReductionManager.addReducer("Math.Arithmetic.ModularMultiplicativeInverse", modInverse, "ArithmeticPackage.modInverse");
	
	ReductionManager.addReducer("Math.Transcendental.NaturalLogarithm", log, "ArithmeticPackage.log");
	ReductionManager.addReducer("Math.Transcendental.DecimalLogarithm", log, "ArithmeticPackage.log");
	ReductionManager.addReducer("Math.Transcendental.BinaryLogarithm",  log, "ArithmeticPackage.log");
	ReductionManager.addReducer("Math.Transcendental.Logarithm",        log, "ArithmeticPackage.log");
	
	ReductionManager.addReducer("Math.Arithmetic.SquareRoot", sqrt, "ArithmeticPackage.sqrt");
	
	ReductionManager.addReducer("Math.Trigonometric.Sine",         trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.Cosine",       trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.Tangent",      trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.Cotangent",    trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.Secant",       trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.Cosecant",     trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.ArcSine",      trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.ArcCosine",    trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.ArcTangent",   trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.ArcCotangent", trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.ArcSecant",    trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.ArcCosecant",  trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Trigonometric.ArcTangent2",  atan2,     "ArithmeticPackage.atan2");
	
	ReductionManager.addReducer("Math.Hyperbolic.Sine",            trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.Cosine",          trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.Tangent",         trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.Cotangent",       trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.Secant",          trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.Cosecant",        trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.ArcSine",         trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.ArcCosine",       trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.ArcTangent",      trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.ArcCotangent",    trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.ArcSecant",       trigHyper, "ArithmeticPackage.trigHyper");
	ReductionManager.addReducer("Math.Hyperbolic.ArcCosecant",     trigHyper, "ArithmeticPackage.trigHyper");
	
	ReductionManager.addReducer("Math.Arithmetic.IntegerPart",    integerPart,    "ArithmeticPackage.integerPart");
	ReductionManager.addReducer("Math.Arithmetic.FractionalPart", fractionalPart, "ArithmeticPackage.fractionalPart");
	ReductionManager.addReducer("Math.Arithmetic.DecimalPlaces",  decimalPlaces,  "ArithmeticPackage.decimalPlaces");
	
	ReductionManager.addReducer("Math.Arithmetic.IsNumeric",        isNumeric, "ArithmeticPackage.isNumeric");
	
	ReductionManager.addReducer("Math.Arithmetic.IsRealNumber",     isX, "ArithmeticPackage.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsRationalNumber", isX, "ArithmeticPackage.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsIntegerValue",   isX, "ArithmeticPackage.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsInteger",        isX, "ArithmeticPackage.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsDecimal",        isX, "ArithmeticPackage.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsNegativeNumber", isX, "ArithmeticPackage.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsPositiveNumber", isX, "ArithmeticPackage.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsNumberZero",     isX, "ArithmeticPackage.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsEven",           isX, "ArithmeticPackage.isX");
	ReductionManager.addReducer("Math.Arithmetic.IsOdd",            isX, "ArithmeticPackage.isX");
	
	ReductionManager.addReducer("Math.Arithmetic.ToInteger",   toX, "ArithmeticPackage.toX");
	ReductionManager.addReducer("Math.Arithmetic.ToIfInteger", toX, "ArithmeticPackage.toX");
	ReductionManager.addReducer("Math.Arithmetic.ToDecimal",   toX, "ArithmeticPackage.toX");
	
	ReductionManager.addReducer("Math.Arithmetic.ToNumber", toNumber, "ArithmeticPackage.toNumber");
	
	ReductionManager.addReducer("Math.Arithmetic.Factorial", factorial, "ArithmeticPackage.factorial");
	
	ReductionManager.addReducer("String.ToString", toString, "ArithmeticPackage.toString");
	ReductionManager.addReducer("Time.ToTime",     toTime,   "ArithmeticPackage.toTime");
	
	ReductionManager.addReducer("Math.Arithmetic.Digits", digits, "ArithmeticPackage.digits");
	
	ReductionManager.addReducer("Math.Arithmetic.GreatestCommonDivisor", gcdLcm, "ArithmeticPackage.gcdLcm");
	ReductionManager.addReducer("Math.Arithmetic.LeastCommonMultiple",   gcdLcm, "ArithmeticPackage.gcdLcm");
	
	ReductionManager.addReducer("Math.Arithmetic.Factors",              factorsDivisors, "ArithmeticPackage.factors");
	ReductionManager.addReducer("Math.Arithmetic.FactorsWithExponents", factorsDivisors, "ArithmeticPackage.factorsWithExponents");
	ReductionManager.addReducer("Math.Arithmetic.Divisors",             factorsDivisors, "ArithmeticPackage.divisors");
	ReductionManager.addReducer("Math.Arithmetic.ProperDivisors",       factorsDivisors, "ArithmeticPackage.properDivisors");
	
	ReductionManager.addReducer("Math.Arithmetic.Divides",       divisionTest, "ArithmeticPackage.divisionTest");
	ReductionManager.addReducer("Math.Arithmetic.DoesNotDivide", divisionTest, "ArithmeticPackage.divisionTest");
	
	ReductionManager.addReducer("Math.Arithmetic.Random",        random,        "ArithmeticPackage.random");
	ReductionManager.addReducer("Math.Arithmetic.RandomInRange", randomInRange, "ArithmeticPackage.randomInRange");
	
	ReductionManager.addReducer("Math.Arithmetic.Piecewise", piecewise, "ArithmeticPackage.piecewise", { special: true });
	
	//ReductionManager.addReducer("Math.Constant.Pi",    constant, "ArithmeticPackage.constant");
	//ReductionManager.addReducer("Math.Constant.Euler", constant, "ArithmeticPackage.constant");
	
	ReductionManager.addReducer("Math.Arithmetic.Summation", summationProductReducer,     "ArithmeticPackage.summationProductReducer", { special: true });
	ReductionManager.addReducer("Math.Arithmetic.Summation", summationProductListReducer, "ArithmeticPackage.summationProductListReducer", { special: true });
	ReductionManager.addReducer("Math.Arithmetic.Product",   summationProductReducer    , "ArithmeticPackage.summationProductReducer", { special: true });
	ReductionManager.addReducer("Math.Arithmetic.Product",   summationProductListReducer, "ArithmeticPackage.summationProductListReducer", { special: true });
	
	ReductionManager.addReducer("Math.Arithmetic.IsPrime", isPrime, "ArithmeticPackage.isPrime");
};

