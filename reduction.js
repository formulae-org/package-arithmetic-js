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

///////////////
// precision //
///////////////

Arithmetic.precision = async (precision, session) => {
	let canonicalNumber = CanonicalArithmetic.expr2CanonicalNumber(precision.children[0]);
	if (canonicalNumber === null) return false;
	
	if (canonicalNumber instanceof CanonicalArithmetic.Decimal) {
		let d = canonicalNumber.decimal;
		let p = d.isZero() ? 0 : d.precision();
		precision.replaceBy(CanonicalArithmetic.number2Expr(p, false));
	}
	else {
		let bi = canonicalNumber.integer;
		if (bi < 0n) bi = -bi;
		precision.replaceBy(CanonicalArithmetic.number2Expr(bi.toString().replace(/0+$/, "").length, false));
	}
	
	return true;
};

Arithmetic.setMaxPrecision = async (setMaxPrecision, session) => {
	let precisionExpr = await session.reduceAndGet(setMaxPrecision.children[0], 0);
	let precision = CanonicalArithmetic.getInteger(precisionExpr);
	if (precision === undefined || precision < 1 || precision > 1e+9) {
		ReductionManager.setInError(precisionExpr, "Expression must be a positive integer number");
		throw new ReductionError();
	}
	
	session.Decimal.precision = precision;
	return true;
};

Arithmetic.getMaxPrecision = async (getMaxPrecision, session) => {
	getMaxPrecision.replaceBy(CanonicalArithmetic.number2Expr(session.Decimal.precision, false));
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
	if (n.children.length != 1) return false; // forward to N(expr, precistion)
	
	let number = CanonicalArithmetic.expr2CanonicalNumeric(n.children[0]);
	if (number === null) return false;
	
	if (number instanceof CanonicalArithmetic.Integer) {
		n.replaceBy(CanonicalArithmetic.decimal2Expr(
			new Decimal(number.integer.toString())
		));
		return true;
	}
	
	if (number instanceof CanonicalArithmetic.Rational) {
		n.replaceBy(CanonicalArithmetic.decimal2Expr(
			session.Decimal.div(
				number.numerator.toString(),
				number.denominator.toString()
			)
		));
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
	let canonicalNumeric = null;
	
	for (pos = 0; pos < n; ++pos) {
		canonicalNumeric = CanonicalArithmetic.expr2CanonicalNumeric(addition.children[pos]);
		if (canonicalNumeric !== null) {
			break;
		}
	}
	
	// there was not any numeric child
	if (pos >= n) return false; // forward to other forms of Addition(...)
	
	// there was, index is (pos)
	let sibling;
	let performed = false;
	
	for (let i = n - 1; i > pos; --i) {
		sibling = CanonicalArithmetic.expr2CanonicalNumeric(addition.children[i]);
		
		if (sibling != null) {
			canonicalNumeric = canonicalNumeric.addition(sibling, session);
			addition.removeChildAt(i);
			performed = true;
		}
	}
	
	if (!performed) return false; // forward to other forms of Addition(...)
	
	//addition.setChild(pos, CanonicalArithmetic.canonicalNumeric2Expr(canonicalNumeric));
	let numericExpression = CanonicalArithmetic.canonicalNumeric2Expr(canonicalNumeric);
	
	if (addition.children.length == 1) { // just one child
		addition.replaceBy(numericExpression);
		//session.log("Addition of numeric addends");
		return true;
	}
	else { // more than one child
		if (CanonicalArithmetic.isZero(numericExpression)) { //  the numeric one is zero (no pun intended)
			// remove the zero expression
			addition.removeChildAt(pos);
			
			if (addition.children.length == 1) { // just one child
				addition.replaceBy(addition.children[0]);
				//session.log("Addition of numeric addends");
				return true;
			}
		}
		else { // numeric result was not zero
			if (pos == 0) {
				if (performed) {
					addition.setChild(0, numericExpression);
				}
			}
			else {
				addition.removeChildAt(pos);
				addition.addChildAt(0, numericExpression);
				performed = true;
			}
		}
		
		//if (performed) session.log("Addition of numeric addends");
		return false; // Ok, forward to other forms of Addition(...)
	}
};

// a - (b + c)   ->   a - b - c
Arithmetic.additionNegativeAddition = async (addition, session) => {
	let child;
	let updates = 0;
	
	for (let i = 0, n = addition.children.length; i < n; ++i) {
		child = addition.children[i];
		
		if (
			child.getTag() === "Math.Arithmetic.Negative" &&
			child.children[0].getTag() === "Math.Arithmetic.Addition"
		) {
			let grandChild = child.children[0];
			
			addition.removeChildAt(i);
			--n;
			++updates;
			
			let negative;
			for (let j = 0, J = grandChild.children.length; j < J; ++j) {
				negative = Formulae.createExpression("Math.Arithmetic.Negative");
				negative.addChild(grandChild.children[j]);
				
				addition.addChildAt(i, negative);
				
				await session.reduce(addition.children[i]);
				
				++i;
				++n;
			}
		}
	}
	
	if (updates > 0) {
		//session.log("Addend of negative addition reduces to negative addends");
		return true;
	}
	
	return false; // Ok, forward to other forms of Addition(..)
};

////////////////////
// multiplication //
////////////////////

Arithmetic.multiplicationNumeric = async (multiplication, session) => {
	let pos, n = multiplication.children.length;
	let canonicalNumeric = null;
	
	for (pos = 0; pos < n; ++pos) {
		canonicalNumeric = CanonicalArithmetic.expr2CanonicalNumeric(multiplication.children[pos]);
		if (canonicalNumeric != null) {
			break;
		}
	}
	
	// there was not any numeric child
	if (pos >= n) return false; // forward to other forms of Multiplication(...)
	
	// there was, index is (pos)
	let sibling;
	let performed = false;
	
	for (let i = n - 1; i > pos; --i) {
		sibling = CanonicalArithmetic.expr2CanonicalNumeric(multiplication.children[i]);
		
		if (sibling != null) {
			canonicalNumeric = canonicalNumeric.multiplication(sibling, session);
			multiplication.removeChildAt(i);
			performed = true;
		}
	}
	
	if (!performed) return false; // forward to other forms of Multiplication(...)
	
	//addition.setChild(pos, CanonicalArithmetic.canonicalNumeric2Expr(canonicalNumeric));
	let numericExpression = CanonicalArithmetic.canonicalNumeric2Expr(canonicalNumeric);
	
	if (multiplication.children.length == 1) { // just one child
		multiplication.replaceBy(numericExpression);
		//session.log("Addition of numeric addends");
		return true;
	}
	else { // more than one child
		if (CanonicalArithmetic.isOne(numericExpression)) { //  the numeric one is one (no pun intended)
			// remove the one expression
			multiplication.removeChildAt(pos);
			
			if (multiplication.children.length == 1) { // just one child
				multiplication.replaceBy(multiplication.children[0]);
				//session.log("Addition of numeric addends");
				return true;
			}
		}
		else { // numeric result was not one
			if (pos == 0) {
				if (performed) {
					multiplication.setChild(0, numericExpression);
				}
			}
			else {
				multiplication.removeChildAt(pos);
				multiplication.addChildAt(0, numericExpression);
				performed = true;
			}
		}
		
		//if (performed) session.log("Addition of numeric addends");
		return false; // Ok, forward to other forms of Multiplication(...)
	}
};

// -W * X * -Y * Z   ->   [-] (W * X * Y * Z)
Arithmetic.multiplicationNegative = async (multiplication, session) => {
	let child;
	let updates = 0;
	
	for (let i = 0, n = multiplication.children.length; i < n; ++i) {
		child = multiplication.children[i];
		
		if (child.getTag() === "Math.Arithmetic.Negative") {
			multiplication.setChild(i, child.children[0]);
			++updates;
		}
	}
	
	if (updates > 0) {
		if (updates % 2 == 0) { // even
			//session.log("Extracts negatives from a multiplication");
			await session.reduce(multiplication);
		}
		else { // odd
			let negative = Formulae.createExpression("Math.Arithmetic.Negative");
			multiplication.replaceBy(negative);
			negative.addChild(multiplication);
			
			//session.log("Extracts negatives from a multiplication");
			await session.reduce(multiplication);
			await session.reduce(negative);
		}
		
		return true;
	}
	
	return false; // Ok, to forward to other forms of Multiplication
};

// numeric * (X + Y)   ->   (numeric * X) + (numeric * Y)
Arithmetic.multiplicationNumericAddition = async (multiplication, session) => {
	let n = multiplication.children.length;
	if (n != 2) {
		return false; // Ok, forward to other forms of Multiplication
	}
	
	let numeric = multiplication.children[0];
	let addition = multiplication.children[1];
	
	if (
		addition.getTag() !== "Math.Arithmetic.Addition" ||
		!CanonicalArithmetic.isExpressionCanonicalNumeric(numeric)
	) {
		return false; // Ok, forward to other forms of Multiplication
	}
	
	let mult, addend;
	let i;
	
	for (i = 0, n = addition.children.length; i < n; ++i) {
		addend = addition.children[i];
		mult = Formulae.createExpression("Math.Arithmetic.Multiplication");
		mult.addChild(numeric.clone());
		mult.addChild(addend);
		
		addition.setChild(i, mult);
	}
	
	multiplication.replaceBy(addition);
	//session.log("Multiplication distributive over addition");
	
	for (i = 0; i < n; ++i) {
		await session.reduce(addition.children[i]);
	}
	
	return true;
};

//////////////
// division //
//////////////

// -x /  y   =>   - ( x / y )
//  x / -y   =>   - ( x / y )
// -x / -y   =>       x / y

Arithmetic.divisionNegatives = async (division, session) => {
	let x = 0;
	
	let n = division.children[0];
	if (n.getTag() === "Math.Arithmetic.Negative") {
		n.replaceBy(n.children[0]);
		++x;
	}
	
	let d = division.children[1];
	if (d.getTag() === "Math.Arithmetic.Negative") {
		d.replaceBy(d.children[0]);
		++x;
	}
	
	if (x == 2) {
		await session.reduce(division);
		return true;
	}
	
	if (x == 1) {
		let negative = Formulae.createExpression("Math.Arithmetic.Negative");
		division.replaceBy(negative);
		negative.addChild(division);
		
		await session.reduce(division);
		await session.reduce(negative);
		
		return true;
	}
	
	return false; // Ok, forward to other forms of Division
};

// x / 0   =>   Infinity
// x / 1   =>   x
// 0 / x   =>   0

Arithmetic.divisionZeroOne = async (division, session) => {
	let den = division.children[1];
	
	if (CanonicalArithmetic.isZero(den)) {
		division.replaceBy(Formulae.createExpression(Arithmetic.TAG_INFINITY));
		//session.log("Division with denominator zero reduces to infinity");
		return true;
	}
	
	if (CanonicalArithmetic.isOne(den)) {
		division.replaceBy(division.children[0]);
		//session.log("Division with denominator one reduces to numerator");
		return true;
	}
	
	let num = division.children[0];
	
	if (CanonicalArithmetic.isZero(num)) {
		division.replaceBy(num);
		//session.log("Division with numerator zero reduces to zero");
		return true;
	}
	
	return false; // Ok, forward to other forms of Division
};

// integer / integer   =>   (if possible, reduces to simplest form)

Arithmetic.divisionIntegers = async (division, session) => {
	let n = division.children[0];
	let d = division.children[1];
	let dn, dd;
	
	if (
		n.getTag() === Arithmetic.TAG_NUMBER && (typeof (dn = n.get("Value")) === "bigint") &&
		d.getTag() === Arithmetic.TAG_NUMBER && (typeof (dd = d.get("Value")) === "bigint")
	) {
		let gcd = CanonicalArithmetic.gcd(dn, dd, session);
		
		if (gcd !== 1n) {
			n.set("Value", dn / gcd);
			
			if (dd === gcd) {
				division.replaceBy(n);
				//session.log("Exact integer division");
				return true;
			}
			
			d.set("Value", dd / gcd);
			//session.log("Rational reduction to a simplest form");
			division.setReduced(); // to prevent further reduction
			return true;
		}
		else { // it is already in simplest form
			division.setReduced(); // to prevent further reduction
			return true;
		}
	}
	
	return false; // Ok, forward to other forms of Division
};

// numeric / numeric   =>   numeric
// numeric / 0         =>   infinity or -infinity (depends on sign of numerator)
Arithmetic.divisionNumerics = async (division, session) => {
	let n, d;
	
	if (
		(n = CanonicalArithmetic.expr2CanonicalNumeric(division.children[0])) != null &&
		(d = CanonicalArithmetic.expr2CanonicalNumeric(division.children[1])) != null
	) {
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
			division.replaceBy(CanonicalArithmetic.canonicalNumeric2Expr(result));
			//session.log("Division between numeric elements");
			division.setReduced(); // to prevent further reduction
			return true;
		}
	}
	
	return false; // Ok, forward to other forms of Division
};

// (numeric * X) / Y                 ->   numeric * (X / Y)
// X / (numeric * Y)                 ->   1/numeric * (X / Y)
// (numeric1 * X) / (numeric2 * Y)   ->   (numeric1 / numeric2) * (X / Y)

Arithmetic.divisionExtractNumerics = async (division, session) => {
	let numerator = division.children[0];
	let denominator = division.children[1];
	let n = null, d = null;
	
	// numerator
	if (
		numerator.getTag() === "Math.Arithmetic.Multiplication" &&
		(n = CanonicalArithmetic.expr2CanonicalNumeric(numerator.children[0])) != null
	) {
		numerator.removeChildAt(0);
		
		if (numerator.children.length == 1) {
			numerator = numerator.children[0];
			division.setChild(0, numerator);
		}
	}
	
	// denominator
	if (
		denominator.getTag() === "Math.Arithmetic.Multiplication" &&
		(d = CanonicalArithmetic.expr2CanonicalNumeric(denominator.children[0])) != null
	) {
		denominator.removeChildAt(0);
		
		if (denominator.children.length == 1) {
			denominator = denominator.children[0];
			division.setChild(1, denominator);
		}
	}
	
	// changes ?
	if (n !== null || d !== null) {
		let multiplication = Formulae.createExpression("Math.Arithmetic.Multiplication");
		
		division.replaceBy(multiplication);
		
		if (d === null) {
			multiplication.addChild(CanonicalArithmetic.canonicalNumeric2Expr(n));
		}
		else {
			if (n === null) {
				n = new CanonicalArithmetic.Integer(1n);
			}
			
			multiplication.addChild(
				CanonicalArithmetic.canonicalNumeric2Expr(
					n.division(d, session)
				)
			);
		}
		
		multiplication.addChild(division);
		//session.log("Extraction of numeric factors from elements of division");
		
		if (n != null) {
			await session.reduce(numerator);
		}
		
		if (d != null) {
			await session.reduce(denominator);
		}
		
		await session.reduce(division);
		await session.reduce(multiplication);
		return true;
	}
	
	return false; // Ok, forward to other forms of Division
};

// number / x   ->   number * 1/x,     number != 1
// x / number   ->   1/number * x

Arithmetic.divisionExtractNumericsAlone = async (division, session) => {
	//let numerator = division.children[0];
	//let denominator = division.children[1];
	let n = CanonicalArithmetic.expr2CanonicalNumeric(division.children[0]);
	let d = CanonicalArithmetic.expr2CanonicalNumeric(division.children[1]);
	
	if ((n === null) === (d === null)) return false;
	
	if (n !== null) { // only the numerator is numeric
		if (n instanceof CanonicalArithmetic.Integer && n.integer === 1n) return false;
		if (n instanceof CanonicalArithmetic.Decimal && n.decimal.equals(1)) return false;
		
		division.setChild(0, CanonicalArithmetic.createCanonicalNumber(1n));
		let multiplication = Formulae.createExpression("Math.Arithmetic.Multiplication");
		division.replaceBy(multiplication);
		multiplication.addChild(CanonicalArithmetic.canonicalNumeric2Expr(n));
		multiplication.addChild(division);
		return true;
	}
	
	// only the denominator is numeric
	let multiplication = Formulae.createExpression("Math.Arithmetic.Multiplication");
	division.replaceBy(multiplication);
	n = new CanonicalArithmetic.Integer(1n);
	multiplication.addChild(
		CanonicalArithmetic.canonicalNumeric2Expr(
			n.division(d, session)
		)
	);
	multiplication.addChild(division);
	return true;
};

/*
Arithmetic.divisionExtractNumericsAlone = async (division, session) => {
	let numerator = division.children[0];
	let denominator = division.children[1];
	let n = null, d = null;
	
	// Numerator
	numerator: if ((n = CanonicalArithmetic.expr2CanonicalNumeric(numerator)) != null) {
		if (CanonicalArithmetic.isOne(numerator)) {
			break numerator;
		}
		
		division.setChild(0, CanonicalArithmetic.createCanonicalNumber(1n));
	}
	
	// Denominator
	if ((d = CanonicalArithmetic.expr2CanonicalNumeric(denominator)) != null) {
		division.replaceBy(numerator);
		division = numerator;
	}
	
	if (n !== null && d !== null) {
		ReductionManager.setInError(division, "You must not reach this point");
		throw new ReductionError();
	}
	
	if (n !== null) {
		if (CanonicalArithmetic.isOne(numerator)) return false;
		
		division.setChild(0, CanonicalArithmetic.createCanonicalNumber(1n));
		let multiplication = Formulae.createExpression("Math.Arithmetic.Multiplication");
		division.replaceBy(multiplication);
		multiplication.addChild(CanonicalArithmetic.canonicalNumeric2Expr(n));
		multiplication.addChild(division);
		return true;
	}
	
	// numerator is null and denominator is not null
	
	let multiplication = Formulae.createExpression("Math.Arithmetic.Multiplication");
	division.replaceBy(multiplication);
	n = new CanonicalArithmetic.Integer(1n);
	multiplication.addChild(
		CanonicalArithmetic.canonicalNumeric2Expr(
			n.division(d, session)
		)
	);
	multiplication.addChild(division);
	return true;
};

Arithmetic.divisionExtractNumericsAlone = async (division, session) => {
	if (CanonicalArithmetic.isExpressionCanonicalNumeric(division)) {
		return false; // Ok, forward to other forms of Division
	}
	
	let numerator = division.children[0];
	let denominator = division.children[1];
	let n = null, d = null;
	
	// Numerator
	numerator: if ((n = CanonicalArithmetic.expr2CanonicalNumeric(numerator)) != null) {
		if (CanonicalArithmetic.isOne(numerator)) {
			break numerator;
		}
		
		division.setChild(0, CanonicalArithmetic.createCanonicalNumber(1n));
	}
	
	// Denominator
	if ((d = CanonicalArithmetic.expr2CanonicalNumeric(denominator)) != null) {
		division.replaceBy(numerator);
		division = numerator;
	}
	
	// Changes ?
	if (n != null || d != null) {
		let multiplication = Formulae.createExpression("Math.Arithmetic.Multiplication");
		division.replaceBy(multiplication);
		
		if (d === null) {
			multiplication.addChild(CanonicalArithmetic.canonicalNumeric2Expr(n));
			console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXX");
		}
		else {
			if (n === null) {
				n = new CanonicalArithmetic.Integer(1n);
			}
			
			multiplication.addChild(
				CanonicalArithmetic.canonicalNumeric2Expr(
					n.division(d, session)
				)
			);
		}
		
		multiplication.addChild(division);
		//session.log("Extraction of numeric elements of a division (???)");
		return true;
	}
	
	return false; // Ok, forward to other forms of Division
};
*/

//////////////
// negative //
//////////////

//  -0   ->   0
// --x   ->   x

Arithmetic.negativeSpecials = async (negative, session) => {
	let arg = negative.children[0];
	
	if (CanonicalArithmetic.isZero(arg)) {
		negative.replaceBy(arg);
		//session.log("Negative of zero becomes zero");
		return true;
	}
	
	if (arg.getTag() === "Math.Arithmetic.Negative") {
		negative.replaceBy(arg.children[0]);
		//session.log("Negative of negative are cancelled");
		return true;
	}
	
	return false; // Ok, forward to other forms of Negative
};

////////////////////
// exponentiation //
////////////////////

// x ^ 0   ->   1
// x ^ 1   ->   x
// 0 ^ x   ->   0 or infinity (if x is negative)
// 1 ^ x   ->   1

Arithmetic.exponentiationSpecials = async (exponentiation, session) => {
	let base =     exponentiation.children[0];
	let exponent = exponentiation.children[1];
	
	////////////////////
	// x ^ 0   ->   1 //
	////////////////////
	
	if (CanonicalArithmetic.isZero(exponent)) {
		let b = CanonicalArithmetic.expr2CanonicalNumber(base);
		
		exponentiation.replaceBy(
			CanonicalArithmetic.number2Expr(
				1,
				exponent.get("Value") instanceof Decimal ||
				(b !== null && b instanceof CanonicalArithmetic.Decimal)
			)
		);
		//session.log("anything raised to zero reduces to one");
		return true;
	}
	
	////////////////////
	// x ^ 1   =>   x //
	////////////////////
	
	if (CanonicalArithmetic.isOne(exponent)) {
		if (typeof exponent.get("Value") === "bigint") {
			exponentiation.replaceBy(base);
			//session.log("base raised to one reduces to base");
		}
		else {
			let n = Formulae.createExpression("Math.Numeric");
			n.addChild(base);
			exponentiation.replaceBy(n);
			//session.log("Numeric base");
			await session.reduce(n);
			//await session.reduce(exponentiation);
		}
		
		return true;
	}
	
	/////////////////////////////////
	// 0 ^  numeric   =>  0        //
	// 0 ^ -numeric   =>  infinity //
	/////////////////////////////////
	
	if (CanonicalArithmetic.isZero(base)) {
		let e = CanonicalArithmetic.expr2CanonicalNumeric(exponent);
		
		if (e !== null) {
			if (exponent.getTag() === "Math.Arithmetic.Negative") {
				exponentiation.replaceBy(Formulae.createExpression("Math.Infinity"));
			}
			else { // exponent is no negative
				exponentiation.replaceBy(
					CanonicalArithmetic.number2Expr(
						0,
						base.get("Value") instanceof Decimal ||
						e instanceof CanonicalArithmetic.Decimal
					)
				);
			}
			
			return true;
		}
	}
	
	////////////////////
	// 1 ^ x   =>   1 //
	////////////////////
	
	if (CanonicalArithmetic.isOne(base)) {
		let e = CanonicalArithmetic.expr2CanonicalNumber(exponent);
		
		exponentiation.replaceBy(
			CanonicalArithmetic.number2Expr(
				1,
				base.get("Value") instanceof Decimal ||
				e instanceof CanonicalArithmetic.Decimal
			)
		);
		//session.log("One raised to anything reduces to one");
		return true;
	}
	
	return false; // Ok, forward to other forms of Exponentiation
};

// (x * y * z) ^ int   ->   (x ^ int) * (y ^ int) * (z ^ int)
// (x   /   y) ^ int   ->   (x ^ int) / (y ^ int)

Arithmetic.exponentiationMultiplicationOrDivision = async (exponentiation, session) => {
	let base = exponentiation.children[0];
	let baseTag = base.getTag();
	
	if (baseTag === "Math.Arithmetic.Division" || baseTag === "Math.Arithmetic.Multiplication") {
		
		let exponent = exponentiation.children[1];
		
		{
			let cn = CanonicalArithmetic.expr2CanonicalNumber(exponent);
			if (cn === null || cn instanceof CanonicalArithmetic.Decimal) {
				return false; // Ok, forward to other forms of Exponentiation(..)
			}
		}
		
		let p;
		let i, n = base.children.length;
		for (i = 0; i < n; ++i) {
			p = Formulae.createExpression("Math.Arithmetic.Exponentiation");
			p.addChild(base.children[i]);
			p.addChild(exponent.clone());
			
			base.setChild(i, p);
		}
		
		exponentiation.replaceBy(base);
		//session.log("Exponentiation distributive over multiplication/division");
		
		for (i = 0; i < n; ++i) {
			await session.reduce(base.children[i]);
		}
		await session.reduce(base);
		
		return true;
	}
	
	return false; // Ok, forward to other forms of Exponentiation
};

// numeric ^ -integer   =>   1 / (numeric ^ integer)

Arithmetic.exponentiationNumericToNegativeInteger = async (exponentiation, session) => {
	// negative exponent
	let exponent = exponentiation.children[1];
	if (exponent.getTag() !== "Math.Arithmetic.Negative") {
		return false; // Ok, forward to other forms of Exponentiation
	}
	
	// exponent is a number
	let positiveExponent = exponent.children[0];
	if (positiveExponent.getTag() !== "Math.Number") {
		return false; // Ok, forward to other forms of Exponentiation
	}
	
	// exponent is an integer number
	if (positiveExponent.get("Value") instanceof Decimal) {
		return false; // Ok, forward to other forms of Exponentiation
	}
	// numeric base
	
	let base = exponentiation.children[0];
	if (!CanonicalArithmetic.isExpressionCanonicalNumeric(base)) {
		return false; // Ok, forward to other forms of Exponentiation
	}
	
	// exponent should fit in a long datatype
	// Number n = CanonicalArithmetic.getNumber(positivePow);
	// if (CanonicalArithmetic.numberToLong(n) == null) {
	// 	return false; // Ok, forward to other forms of Exponentiation
	// }
	
	// Ok
	exponentiation.setChild(1, positiveExponent);
	
	let div = Formulae.createExpression("Math.Arithmetic.Division");
	exponentiation.replaceBy(div);
	
	div.addChild(CanonicalArithmetic.bigInt2Expr(1n));
	div.addChild(exponentiation);
	
	//session.log("Negative exponentiation as reciprocal");
	
	await session.reduce(exponentiation); // reduce the new pow
	await session.reduce(div); // reduce the new div
	
	return true;
};

// (-numeric) ^ (positive integer)
// =>   numeric ^ pow   if pow is even
// => -(numeric ^ pow)  if pow is odd

Arithmetic.exponentiationNegativePositiveInteger = async (exponentiation, session) => {
	let base = exponentiation.children[0];
	
	// base must be a negative numeric
	if (!(
		base.getTag() === "Math.Arithmetic.Negative" &&
		CanonicalArithmetic.isExpressionCanonicalNumeric(base)
	)) {
		return false; // Ok, forward to other forms of Exponentiation
	}
	
	let exponent = exponentiation.children[1];
	
	// exponent must be positive
	if (exponent.getTag() === "Math.Arithmetic.Negative") {
		return false; // Ok, forward to other forms of Exponentiation
	}
	
	// exponent must be an integer, positive number
	let cn = CanonicalArithmetic.expr2CanonicalNumber(exponent);
	if (
		cn === null ||
		!cn.decimal.isInteger() ||
		cn.decimal.lessThan(0)
	) {
		return false; // Ok, forward to other forms of Exponentiation
	}
	
	///////////////////////////////
	
	base.replaceBy(base.children[0]);
	
	if (cn.decimal.module(2) == 0) { // even
		//session.log("Even pow of a negative argument becomes positive");
		await session.reduce(exponentiation);
	}
	else { // odd
		let negative = Formulae.createExpression("Math.Arithmetic.Negative");
		exponentiation.replaceBy(negative);
		negative.addChild(exponentiation);
		//session.log("Odd pow of a negative arguments becomes negative pow");
		//await session.reduce(negative);
		await session.reduce(exponentiation);
	}
	
	return true;
};

// number ^ number

Arithmetic.exponentiationNumerics = async (exponentiation, session) => {
	let base;
	if ((base = CanonicalArithmetic.expr2CanonicalNumeric(exponentiation.children[0])) === null) return false;
	
	let exponent;
	if ((exponent = CanonicalArithmetic.expr2CanonicalNumeric(exponentiation.children[1])) === null) return false;
	
	if (exponent.isZero()) {
		if (exponent instanceof CanonicalArithmetic.Integer) {
			if (base instanceof CanonicalArithmetic.Decimal) {
				exponentiation.replaceBy(CanonicalArithmetic.decimal2Expr(new session.Decimal(1)));
			}
			else {
				exponentiation.replaceBy(CanonicalArithmetic.bigInt2Expr(1n));
			}
		}
		else {
			exponentiation.replaceBy(Formulae.createExpression(Arithmetic.TAG_INFINITY));
		}
		return true;
	}
	
	if (exponent.isOne()) {
		if (exponent instanceof CanonicalArithmetic.Integer) {
			exponentiation.replaceBy(CanonicalArithmetic.canonicalNumeric2Expr(base));
		}
		else {
			exponentiation.replaceBy(CanonicalArithmetic.canonicalNumeric2Expr(base.toDecimal(session)));
		}
		return true;
	}
	
	// 0 ^ x   ->   0 or infinity (if x is negative)
	if (base.isZero()) {
		if (exponent.isNegative()) {
			exponentiation.replaceBy(Formulae.createExpression(Arithmetic.TAG_INFINITY));
		}
		else {
			if (base instanceof CanonicalArithmetic.Integer) {
				exponentiation.replaceBy(CanonicalArithmetic.bigInt2Expr(0n));
			}
			else {
				exponentiation.replaceBy(CanonicalArithmetic.decimal2Expr(new session.Decimal(0)));
			}
		}
		return true;
	}

	if (base.isOne()) {
		if (base instanceof CanonicalArithmetic.Decimal || exponent instanceof CanonicalArithmetic.Decimal) {
			exponentiation.replaceBy(CanonicalArithmetic.decimal2Expr(new session.Decimal(1)));
		}
		else {
			exponentiation.replaceBy(CanonicalArithmetic.bigInt2Expr(1n));
		}
		return true;
	}
	
	////////////////////////////////////////////////////////////////////////////
	// if base is negative and exponent is non-integer, the result is complex //
	////////////////////////////////////////////////////////////////////////////
	
	if (base.isNegative() && !exponent.hasIntegerValue()) {
		//////////////////////////////////////////////////////////////////////////////////////////////////////////////
		// if base is not decimal, and exponent is rational, no calculation is performed, since it is already exact //
		//////////////////////////////////////////////////////////////////////////////////////////////////////////////
		
		if (
			!(base instanceof CanonicalArithmetic.Decimal) &&
			exponent instanceof CanonicalArithmetic.Rational
		) return false;
		
		///////////////////////////////////////////////////////////////////////////
		// the exponent is necessarily decimal, the complex number is calculated //
		///////////////////////////////////////////////////////////////////////////
		
		base = base.toDecimal(session);
		exponent = exponent.toDecimal(session);
		
		let arg = session.Decimal.atan2(0, base.decimal);
		let loh = session.Decimal.ln(base.decimal.abs());
		
		let a = session.Decimal.exp(session.Decimal.mul(exponent.decimal, loh));
		let b = session.Decimal.mul(exponent.decimal, arg);
		
		let complex = Formulae.createExpression("Math.Arithmetic.Addition");
		complex.addChild(CanonicalArithmetic.decimal2Expr(session.Decimal.mul(a, session.Decimal.cos(b))));
		let multiplication = Formulae.createExpression("Math.Arithmetic.Multiplication");
		multiplication.addChild(CanonicalArithmetic.decimal2Expr(session.Decimal.mul(a, session.Decimal.sin(b))));
		multiplication.addChild(Formulae.createExpression("Math.Complex.Imaginary"));
		complex.addChild(multiplication);
		exponentiation.replaceBy(complex);
		//await session.reduce(complex);
		return true;
	}
	
	///////////////////////////////////////////////////////////////////////////////////////
	// exponent is both integer and negative, result is the inverse of positive exponent //
	///////////////////////////////////////////////////////////////////////////////////////
	
	let inverse = false;
	
	if (exponent instanceof CanonicalArithmetic.Integer && exponent.isNegative()) {
		inverse = true;
		exponent = exponent.negate();
	}
	
	////////
	// Ok //
	////////
	
	let result = base.exponentiation(exponent, session);
	if (result === null) return false;
	
	if (inverse) {
		if (result.isZero()) {
			exponentiation.replaceBy(Formulae.createExpression(Arithmetic.TAG_INFINITY));
			return true;
		}
		
		result = (new CanonicalArithmetic.Integer(1)).division(result, session);
	}
	
	exponentiation.replaceBy(CanonicalArithmetic.canonicalNumeric2Expr(result));
	exponentiation.setReduced(); // to prevent further reduction
	return true;

	/*
	
	// base is big decimal
	// exponent is not a canonical number
	// call the numeric on the exponent and return.
	if (nExponent === null && nBase !== null && nBase instanceof CanonicalArithmetic.Decimal) {
		let nExpression = Formulae.createExpression("Math.Numeric");
		nExpression.addChild(eExponent);
		exponentiation.setChild(1, numberExpression);
		if (CanonicalArithmetic.isExpressionCanonicalNumber(await session.reduceAndGet(numberExpression, 0))) {
			await session.reduce(exponentiation);
		}
		return true;
	}
	
	// exponent is big decimal
	// base is not a canonical number
	// call the numeric on the base and return.
	if (nBase === null && nExponent !== null && nExponent instanceof CanonicalArithmetic.Decimal) {
		let numberExpression = Formulae.createExpression("Math.Numeric");
		numberExpression.addChild(eBase);
		exponentiation.setChild(0, numberExpression);
		if (CanonicalArithmetic.isExpressionCanonicalNumber(await session.reduceAndGet(numberExpression, 0))) {
			await session.reduce(exponentiation);
		}
		return true;
	}
	
	////////////////////////////////////////
	// Both base and exponents are number //
	////////////////////////////////////////
	
	// Either base or exponent is not number
	if (nBase === null || nExponent === null) {
		return false; // Ok, forward to other forms of Exponentiation
	}
	
	//////////////////////////////////////////////
	// pitfall, none of the above were executed //
	//////////////////////////////////////////////
	
	real: {
		let result = session.Decimal.pow(nBase.decimal, nExponent.decimal);
		
		if (result.isNaN()) {
			break real;
		}
		
		exponentiation.replaceBy(CanonicalArithmetic.decimal2Expr(result));
		return true;
	}
	
	// complex
	
	let arg = session.Decimal.atan2(0, nBase.decimal);
	let loh = session.Decimal.ln(nBase.decimal.abs());
	
	let a = session.Decimal.exp(session.Decimal.mul(nExponent.decimal, loh));
	let b = session.Decimal.mul(nExponent.decimal, arg);
	
	let complex = Formulae.createExpression("Math.Arithmetic.Addition");
	complex.addChild(CanonicalArithmetic.decimal2Expr(session.Decimal.mul(a, session.Decimal.cos(b))));
	let multiplication = Formulae.createExpression("Math.Arithmetic.Multiplication");
	multiplication.addChild(CanonicalArithmetic.decimal2Expr(session.Decimal.mul(a, session.Decimal.sin(b))));
	multiplication.addChild(Formulae.createExpression("Math.Complex.Imaginary"));
	complex.addChild(multiplication);
	exponentiation.replaceBy(complex);
	await session.reduce(complex);
	return true;
	*/
};

Arithmetic.comparisonNumerics = async (comparisonExpression, session) => {
	let left = CanonicalArithmetic.expr2CanonicalNumeric(comparisonExpression.children[0]);
	if (left === null) return false;
	
	let right = CanonicalArithmetic.expr2CanonicalNumeric(comparisonExpression.children[1]);
	if (right === null) return false;
	
	let result = left.comparison(right, session);
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

Arithmetic.rationalize = async (rationalize, session) => {
	let canonicalNumber = CanonicalArithmetic.expr2CanonicalNumber(rationalize.children[0]);
	if (canonicalNumber === null) return false;
	
	// integer or rational
	if (!(canonicalNumber instanceof CanonicalArithmetic.Decimal)) {
		rationalize.replaceBy(rationalize.children[0]);
		return true;
	}
	
	// it is decimal
	if (canonicalNumber.decimal.isInteger()) {
		rationalize.replaceBy(CanonicalArithmetic.bigInt2Expr(BigInt(canonicalNumber.decimal.toFixed())));
		return true;
	}
	
	if (rationalize.children.length == 1) {
		let tenPow = session.Decimal.pow(10, canonicalNumber.decimal.decimalPlaces());
		let rational = new CanonicalArithmetic.Rational(
			BigInt(session.Decimal.mul(canonicalNumber.decimal, tenPow).toFixed()),
			BigInt(tenPow.toFixed())
		);
		rational.minimize(session);
		rationalize.replaceBy(CanonicalArithmetic.canonicalNumeric2Expr(rational));
	}
	else {
		let repeating = CanonicalArithmetic.getInteger(rationalize.children[1]);
		if (repeating === undefined || repeating < 1) return false;
		
		let places = canonicalNumber.decimal.decimalPlaces();
		let offset = places - repeating;
		
		canonicalNumber.decimal = Arithmetic.movePointToRight(session, canonicalNumber.decimal, offset);
		let integralPart = canonicalNumber.decimal.floor();
		let fractionalPart = Arithmetic.movePointToRight(session, Decimal.sub(canonicalNumber.decimal, integralPart), repeating);
		let divisor1 = Arithmetic.movePointToRight(session, 1, offset);
		let divisor2 = Arithmetic.movePointToRight(session, session.Decimal.sub(Arithmetic.movePointToRight(session, 1, repeating), 1), offset);
		
		let rational1 = new CanonicalArithmetic.Rational(BigInt(integralPart.toFixed()),   BigInt(divisor1.toFixed()));
		let rational2 = new CanonicalArithmetic.Rational(BigInt(fractionalPart.toFixed()), BigInt(divisor2.toFixed()));
		
		let result = rational1.addition(rational2, session);
		rationalize.replaceBy(CanonicalArithmetic.canonicalNumeric2Expr(result));
	}
	
	return true;
};

Arithmetic.absNumeric = async (abs, session) => {
	let arg = abs.children[0];
	let numeric = CanonicalArithmetic.expr2CanonicalNumeric(arg);
	
	if (numeric === null) return false;
	
	if (numeric.isNegative()) {
		abs.replaceBy(CanonicalArithmetic.canonicalNumeric2Expr(numeric.negate()));
	}
	else {
		abs.replaceBy(arg);
	}
	
	return true;
};

Arithmetic.signNumeric = async (sign, session) => {
	let arg = sign.children[0];
	let numeric = CanonicalArithmetic.expr2CanonicalNumeric(arg);
	
	if (numeric === null) return false;
	
	let value = numeric.isZero() ? 0n : (numeric.isNegative() ? -1n : 1n);
	sign.replaceBy(CanonicalArithmetic.bigInt2Expr(value));
	return true;
};

Arithmetic.floorCeilingRoundTruncate = async (fcrt, session) => {
	let arg = fcrt.children[0];
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
	
	let numeric = CanonicalArithmetic.expr2CanonicalNumeric(arg);
	if (numeric === null) return false;
	
	let decimal;
	if (numeric instanceof CanonicalArithmetic.Decimal) {
		decimal = numeric.decimal;
	}
	else if (numeric instanceof CanonicalArithmetic.Integer) {
		decimal = new session.Decimal(numeric.integer.toString());
	}
	else { // rational
		let sn = numeric.numerator.toString();
		let sd = numeric.denominator.toString();
		
		//let precision = sn.length - sd.length;
		//if (precision < 0) precision = 0;
		//precision += places + 10;
		
		let oldPrecision = session.Decimal.precision;
		session.Decimal.set({ precision: sn.length + places + 10 });
		
		decimal = session.Decimal.div(sn, sd);
		//decimal = (new session.Decimal(sn)).dividedToIntegerBy(sd);
		
		session.Decimal.set({ precision: oldPrecision });
	}
	
	switch (fcrt.getTag()) {
		case "Math.Arithmetic.Truncate": decimal = decimal.toDecimalPlaces(places, 1); break;
		case "Math.Arithmetic.Ceiling" : decimal = decimal.toDecimalPlaces(places, 2); break;
		case "Math.Arithmetic.Floor"   : decimal = decimal.toDecimalPlaces(places, 3); break;
		case "Math.Arithmetic.Round"   : decimal = decimal.toDecimalPlaces(places   ); break;
	}
	
	if (places <= 0) {
		fcrt.replaceBy(CanonicalArithmetic.bigInt2Expr(BigInt(decimal.toFixed())));
	}
	else {
		fcrt.replaceBy(CanonicalArithmetic.decimal2Expr(decimal));
	}
	
	return true;
};

Arithmetic.divMod = async (divMod, session) => {
	let dividend = CanonicalArithmetic.expr2CanonicalNumeric(divMod.children[0]);
	if (dividend === null) return false;
	
	let divisor = CanonicalArithmetic.expr2CanonicalNumeric(divMod.children[1]);
	if (divisor === null) return false;
	
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
		result.addChild(CanonicalArithmetic.canonicalNumeric2Expr(dm[0]));
		result.addChild(CanonicalArithmetic.canonicalNumeric2Expr(dm[1]));
	}
	else {
		result = CanonicalArithmetic.canonicalNumeric2Expr(dm[isDiv ? 0: 1])
	}
	
	divMod.replaceBy(result);
	return true;
};

Arithmetic.modPow = async (modPow, session) => {
	let b = CanonicalArithmetic.expr2CanonicalNumeric(modPow.children[0]);
	if (b === null || !(b instanceof CanonicalArithmetic.Integer) || b.integer < 0n) {
		ReductionManager.setInError(modPow.children[0], "Base must be an integer, non-negative number");
		throw new ReductionError();
	}
	
	let e = CanonicalArithmetic.expr2CanonicalNumeric(modPow.children[1]);
	if (e === null || !(e instanceof CanonicalArithmetic.Integer) | e.integer < 0n) {
		ReductionManager.setInError(modPow.children[1], "Exponent must be an integer, non-negative number");
		throw new ReductionError();
	}

	let m = CanonicalArithmetic.expr2CanonicalNumeric(modPow.children[2]);
	if (m === null || !(m instanceof CanonicalArithmetic.Integer) || m.integer < 0n) {
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
	
	modPow.replaceBy(CanonicalArithmetic.bigInt2Expr(r));
	return true;
};

Arithmetic.modInverse = async (modInverse, session) => {
	let a = CanonicalArithmetic.expr2CanonicalNumeric(modInverse.children[0]);
	if (a === null || !(a instanceof CanonicalArithmetic.Integer) || a.integer < 0n) {
		ReductionManager.setInError(modInverse.children[0], "Expression must be an non-negative integer");
		throw new ReductionError();
	}
	
	let m = CanonicalArithmetic.expr2CanonicalNumeric(modInverse.children[1]);
	if (m === null || !(m instanceof CanonicalArithmetic.Integer) || m.integer < 0n) {
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
	
	modInverse.replaceBy(CanonicalArithmetic.bigInt2Expr(t));
	return true;
};

Arithmetic.mapLogs = new Map();
Arithmetic.mapLogs.set("Math.Trascendental.NaturalLogarithm", null);
Arithmetic.mapLogs.set("Math.Trascendental.DecimalLogarithm", 10);
Arithmetic.mapLogs.set("Math.Trascendental.BinaryLogarithm",  2);

Arithmetic.log = async (log, session) => {
	let x = CanonicalArithmetic.expr2CanonicalNumber(log.children[0]);
	if (x === null || !(x instanceof CanonicalArithmetic.Decimal)) return false; // forward to other forms of log()
	x = x.decimal;
	
	let base = null;
	
	if (log.children.length === 1) {
		let b = Arithmetic.mapLogs.get(log.getTag());
		if (b !== null)  {
			base = new session.Decimal(b);
		}
	}
	else { // base is provided
		let n = CanonicalArithmetic.expr2CanonicalNumber(log.children[1]);
		if (n === null) return false; // forward to other forms of log()
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
			CanonicalArithmetic.decimal2Expr(
				base === null ?
				session.Decimal.ln(x) :
				session.Decimal.log(x, base)
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
		mult.addChild(CanonicalArithmetic.decimal2Expr(imaginaryPart));
		mult.addChild(Formulae.createExpression("Math.Complex.Imaginary"));
		let addition = Formulae.createExpression("Math.Arithmetic.Addition");
		addition.addChild(CanonicalArithmetic.decimal2Expr(realPart));
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
	let numeric = CanonicalArithmetic.expr2CanonicalNumeric(arg);
	
	if (numeric === null) return false; // to forward to other forms of log
	
	///////////////////////
	// negative argument //
	///////////////////////
	let negative;
	if (negative = numeric.isNegative()) {
		numeric = numeric.negate();
	}

	let expr;
		
	if (numeric instanceof CanonicalArithmetic.Decimal) {
		expr = CanonicalArithmetic.decimal2Expr(session.Decimal.sqrt(numeric.decimal));
	}
	else if (numeric instanceof CanonicalArithmetic.Integer) {
		let r = session.Decimal.sqrt(numeric.integer.toString());
		if (r.isInteger()) {
			expr = CanonicalArithmetic.bigInt2Expr(BigInt(r.toString()));
		}
		else {
			if (negative) {
				expr = Formulae.createExpression("Math.Arithmetic.SquareRoot");
				expr.addChild(CanonicalArithmetic.canonicalNumeric2Expr(numeric));
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
			let rational = new CanonicalArithmetic.Rational(BigInt(n.toFixed()), BigInt(d.toFixed()));
			rational.minimize();
			expr = CanonicalArithmetic.canonicalNumeric2Expr(rational);
		}
		else if (ni !== di) {
			let N, D;
			
			if (ni) {
				N = CanonicalArithmetic.bigInt2Expr(BigInt(n.toString()));
			}
			else {
				N = Formulae.createExpression("Math.Arithmetic.SquareRoot");
				N.addChild(CanonicalArithmetic.bigInt2Expr(numeric.numerator));
			}
			
			if (di) {
				D = CanonicalArithmetic.bigInt2Expr(BigInt(d.toString()));
			}
			else {
				D = Formulae.createExpression("Math.Arithmetic.SquareRoot");
				D.addChild(CanonicalArithmetic.bigInt2Expr(numeric.denominator));
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
			expr.addChild(CanonicalArithmetic.canonicalNumeric2Expr(numeric));
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
	let number = CanonicalArithmetic.expr2CanonicalNumber(arg);
	if (number === null || !(number instanceof CanonicalArithmetic.Decimal)) return false;   // to forward to another forms

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
		f.replaceBy(CanonicalArithmetic.decimal2Expr(result));
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
	let numbery = CanonicalArithmetic.expr2CanonicalNumber(atan2.children[0]);
	if (numbery === null) return false;   // to forward to another forms
	
	let numberx = CanonicalArithmetic.expr2CanonicalNumber(atan2.children[1]);
	if (numberx === null) return false;   // to forward to another forms
	
	if (numberx.isZero() && numbery.isZero()) {
		atan2.replaceBy(Formulae.createExpression("Math.Infinity"));
		return true;
	}
	
	if (numberx instanceof CanonicalArithmetic.Integer) {
		numberx = new CanonicalArithmetic.Decimal(new session.Decimal(numberx.integer.toString()));
	}
	
	if (numbery instanceof CanonicalArithmetic.Integer) {
		numbery = new CanonicalArithmetic.Decimal(new session.Decimal(numbery.integer.toString()));
	}
	
	atan2.replaceBy(CanonicalArithmetic.decimal2Expr(
		session.Decimal.atan2(numbery.decimal, numberx.decimal)
	));
	
	return true;
};

Arithmetic.integerPart = async (f, session) => {
	let arg = f.children[0];
	let numeric = CanonicalArithmetic.expr2CanonicalNumeric(arg);
	if (numeric === null) return false; // to forward to another forms of integer/fraction part
	
	if (numeric instanceof CanonicalArithmetic.Decimal) {
		f.replaceBy(
			CanonicalArithmetic.bigInt2Expr(
				BigInt(numeric.decimal.abs().truncated().toFixed())
			)
		);
	}
	else if (numeric instanceof CanonicalArithmetic.Integer) {
		f.replaceBy(arg);
	}
	else { // rational
		f.replaceBy(CanonicalArithmetic.bigInt2Expr(
			(numeric.numerator < 0n ? -numeric.numerator : numeric.numerator) / numeric.denominator
		));
	}
	
	return true;
};

Arithmetic.fractionalPart = async (f, session) => {
	let arg = f.children[0];
	let numeric = CanonicalArithmetic.expr2CanonicalNumeric(arg);
	if (numeric === null) return false; // to forward to another forms of integer/fraction part
	
	if (numeric instanceof CanonicalArithmetic.Decimal) {
		let x = numeric.decimal.abs();
		f.replaceBy(CanonicalArithmetic.decimal2Expr(
			session.Decimal.sub(x, x.truncated())
		));
	}
	else if (numeric instanceof CanonicalArithmetic.Integer) {
		f.replaceBy(CanonicalArithmetic.decimal2Expr(new session.Decimal(0)))
	}
	else { // rational
		let rational = new CanonicalArithmetic.Rational(
			(numeric.numerator < 0n ? -numeric.numerator : numeric.numerator) % numeric.denominator,
			numeric.denominator
		);
		f.replaceBy(CanonicalArithmetic.canonicalNumeric2Expr(rational));
	} 
	
	return true;
};

Arithmetic.isX = async (is, session) => {
	let numeric = CanonicalArithmetic.expr2CanonicalNumeric(is.children[0]);
	let result;
	
	switch (is.getTag()) {
		case "Math.Arithmetic.IsRealNumber":
			result = numeric !== null && !(numeric instanceof CanonicalArithmetic.Rational);
			break;
			
		case "Math.Arithmetic.IsRationalNumber":
			result = numeric !== null && numeric instanceof CanonicalArithmetic.Rational;
			break;
			
		case "Math.Arithmetic.IsNumeric":
			result = numeric !== null;;
			break;
			
		case "Math.Arithmetic.IsIntegerValue":
			result =
				numeric !== null && (
					numeric instanceof CanonicalArithmetic.Integer ||
					numeric instanceof CanonicalArithmetic.Decimal && numeric.decimal.isInteger()
				)
			;
			break;
			
		case "Math.Arithmetic.IsInteger":
			result = numeric !== null && numeric instanceof CanonicalArithmetic.Integer;
			break;
			
		case "Math.Arithmetic.IsDecimal":
			result = numeric !== null && numeric instanceof CanonicalArithmetic.Decimal;
			break;
			
		case "Math.Arithmetic.IsNegativeNumber":
			result = numeric !== null && numeric.isNegative();
			break;
			
		case "Math.Arithmetic.IsPositiveNumber":
			result = numeric !== null && numeric.isPositive();
			break;
			
		case "Math.Arithmetic.IsNumberZero":
			result = numeric !== null && numeric.isZero();
			break;
			
		case "Math.Arithmetic.IsEven":
			result =
				numeric !== null && (
					numeric instanceof CanonicalArithmetic.Integer && numeric.integer % 2n == 0n ||
					numeric instanceof CanonicalArithmetic.Decimal && numeric.decimal.isInteger() && numeric.decimal.div(2).isInteger()
				)
			;
			break;
			
		case "Math.Arithmetic.IsOdd":
			result =
				numeric !== null && (
					numeric instanceof CanonicalArithmetic.Integer && numeric.integer % 2n != 0n ||
					numeric instanceof CanonicalArithmetic.Decimal && numeric.decimal.isInteger() && !numeric.decimal.div(2).isInteger()
				)
			;
			break;
	}
	
	is.replaceBy(Formulae.createExpression(result ? "Logic.True" : "Logic.False"));
	return true;
};

Arithmetic.toX = async (to, session) => {
	let arg = to.children[0];
	let number = CanonicalArithmetic.expr2CanonicalNumber(arg);
	if (number === null) return false;
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
		to.replaceBy(arg);
	}
	else {
		to.replaceBy(CanonicalArithmetic.canonicalNumeric2Expr(newNumber));
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
			point ?
			CanonicalArithmetic.decimal2Expr(new session.Decimal(s)) :
			CanonicalArithmetic.bigInt2Expr(BigInt(s))
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
			point ?
			CanonicalArithmetic.decimal2Expr(number) :
			CanonicalArithmetic.bigInt2Expr(BigInt(number.toFixed()))
		);
		return true;
	}
};

Arithmetic.factorial = async (factorial, session) => {
	let number = CanonicalArithmetic.getInteger(factorial.children[0]);
	if (number === undefined || number < 0n) return false;
	
	let result = 1n;
	for (let i = 2n; i <= number; ++i) result *= i;
	
	factorial.replaceBy(CanonicalArithmetic.bigInt2Expr(result));
	return true;
};

Arithmetic.toString = async (toString, session) => {
	let number = CanonicalArithmetic.expr2CanonicalNumber(toString.children[0]);
	if (number === null) return false;
	
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
		else {
			expr.set("Value", number.decimal.toFixed());
		}
		
		toString.replaceBy(expr);
		return true;
	}
	
	//let expr = Formulae.createExpression("String.String");
	//expr.set("Value", session.Decimal.toStringBinary(number.decimal, base));
	//toString.replaceBy(expr);
	//return true;
	return false;
};

Arithmetic.digits = async (digits, session) => {
	let number = CanonicalArithmetic.expr2CanonicalNumber(digits.children[0]);
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
		expr.addChildAt(0, CanonicalArithmetic.bigInt2Expr(remainder));
	} while (quotient != 0n);
	
	if (digits.children.length >= 3) {
		let size = CanonicalArithmetic.getInteger(digits.children[2]);
		if (size === undefined || base < 1 ) return false;
		if (size > expr.children.length) {
			for (let i = 0, n = size - expr.children.length; i < n; ++i) {
				expr.addChildAt(0, CanonicalArithmetic.number2Expr(0));
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
		gcdLcm.replaceBy(CanonicalArithmetic.bigInt2Expr(r))
		return true;
	}
	else { // more than one child
		if (pos == 0) {
			if (performed) {
				list.setChild(0, CanonicalArithmetic.bigInt2Expr(r));
			}
		}
		else {
			list.removeChildAt(pos);
			list.addChildAt(0, CanonicalArithmetic.bigInt2Expr(r));
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
		list.addChild(CanonicalArithmetic.bigInt2Expr(2n));
		n = n / 2n;
	}
	
	if (n > 1n) {
		let f = 3n;
		while ((f * f) <= n) {
			if ((n % f) == 0n) {
				list.addChild(CanonicalArithmetic.bigInt2Expr(f));
				n = n / f;
			}
			else {
				f = f + 2n;
			}
		}
		
		list.addChild(CanonicalArithmetic.bigInt2Expr(n));
	}
	
	factors.replaceBy(list);
	return true;
};

Arithmetic.divisionTest = async (divisionTest, session) => {
	let divisor = CanonicalArithmetic.getBigInt(divisionTest.children[0]);
	if (divisor === undefined || divisor == 0n) return false;
	
	let multiple = CanonicalArithmetic.getBigInt(divisionTest.children[1]);
	if (multiple === undefined) return false;

	let divides = (multiple % divisor) == 0n;	
	if (divisionTest.getTag() === "Math.Arithmetic.DoesNotDivide") divides = !divides;
	
	divisionTest.replaceBy(Formulae.createExpression(divides ? "Logic.True" : "Logic.False"));
	return true;
};

Arithmetic.random = (random, session) => {
	let prec = null;
	if (random.children.length >= 1) {
		prec = CanonicalArithmetic.getBigInt(random.children[0]);
		if (prec === undefined || prec < 1n) return false;
	}
	
	random.replaceBy(CanonicalArithmetic.decimal2Expr(
		prec === null ? session.Decimal.random() : session.Decimal.random(Number(prec))
	));
	
	return true;
};

Arithmetic.randomInRange = async (randomInRange, session) => {
	let n1 = CanonicalArithmetic.getInteger(randomInRange.children[0]);
	if (n1 === undefined) return false;
	
	let n2 = CanonicalArithmetic.getInteger(randomInRange.children[1]);
	if (n2 === undefined) return false;
	
	if (n1 == n2) return false;

	let x = Math.min(n1, n2) + Math.trunc(Math.random() * (Math.abs(n2 - n1) + 1));
	randomInRange.replaceBy(CanonicalArithmetic.number2Expr(x, false));
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
	n.replaceBy(CanonicalArithmetic.decimal2Expr(session.Decimal.acos(-1)));
	return true;
};

Arithmetic.nE = async (n, session) => {
	if (n.children.length > 1 || n.children[0].getTag() !== "Math.Constant.Euler") return false;
	n.replaceBy(CanonicalArithmetic.decimal2Expr(session.Decimal.exp(1)));
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
			from = CanonicalArithmetic.expr2CanonicalNumeric(summationProduct.children[2]);
			if (from === null) {
				return false;
			}
		}
		else {
			//from = session.getFactory().createExpression(ArithmeticDescriptor.TAG_NUMBER);
			//from.set("Value", BigInteger.ONE);
			from = new CanonicalArithmetic.Integer(1n);
		}
		
		// to
		let to = CanonicalArithmetic.expr2CanonicalNumeric(summationProduct.children[n == 3 ? 2 : 3]);
		if (to === null) {
			return false;
		}
		
		// step
		let step;
		if (n == 5) {
			step = CanonicalArithmetic.expr2CanonicalNumeric(summationProduct.children[4]);
			if (step === null) {
				return false;
			}
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
			
			scopeEntry.setValue(CanonicalArithmetic.canonicalNumeric2Expr(from));
			
			result.addChild(clone = arg.clone());
			//session.log("Element created");
			
			await session.reduce(clone);
			
			from = from.addition(step, session);
		}
		
		result.removeScope();
	}
	
	if ((n = result.children.length) == 0) {
		result.replaceBy(
			CanonicalArithmetic.bigInt2Expr(summation ? 0n : 1n)
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
			CanonicalArithmetic.bigInt2Expr(summation ? 0n : 1n)
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

Arithmetic.setReducers = () => {
	ReductionManager.addReducer("Math.Arithmetic.Precision", Arithmetic.precision);
	ReductionManager.addReducer("Math.Arithmetic.SetMaxPrecision", Arithmetic.setMaxPrecision);
	ReductionManager.addReducer("Math.Arithmetic.GetMaxPrecision", Arithmetic.getMaxPrecision);
	
	ReductionManager.addReducer("Math.Arithmetic.SetRoundingMode", Arithmetic.setRoundingMode);
	ReductionManager.addReducer("Math.Arithmetic.GetRoundingMode", Arithmetic.getRoundingMode);
	
	ReductionManager.addReducer("Math.Arithmetic.SetEuclideanDivisionMode", Arithmetic.setEuclideanDivisionMode);
	ReductionManager.addReducer("Math.Arithmetic.GetEuclideanDivisionMode", Arithmetic.getEuclideanDivisionMode);
	
	ReductionManager.addReducer("Math.Numeric", Arithmetic.nNumeric);
	ReductionManager.addReducer("Math.Numeric", Arithmetic.nPrecision, true, ReductionManager.PRECEDENCE_HIGH);
	ReductionManager.addReducer("Math.Numeric", Arithmetic.nPi);
	ReductionManager.addReducer("Math.Numeric", Arithmetic.nE);
	ReductionManager.addReducer("Math.Numeric", ReductionManager.expansionReducer, false, ReductionManager.PRECEDENCE_LOW);
	
	//ReductionManager.addReducer("Math.Arithmetic.Addition", Arithmetic.additionNumeric, false, ReductionManager.PRECEDENCE_HIGH);
	ReductionManager.addReducer("Math.Arithmetic.Addition", Arithmetic.additionNumeric);
	if (Arithmetic.symbolic) ReductionManager.addReducer("Math.Arithmetic.Addition", ReductionManager.itselfReducer);
	if (Arithmetic.symbolic) ReductionManager.addReducer("Math.Arithmetic.Addition", Arithmetic.additionNegativeAddition);
	
	//ReductionManager.addReducer("Math.Arithmetic.Multiplication", Arithmetic.multiplicationNumeric, false, ReductionManager.PRECEDENCE_HIGH);
	ReductionManager.addReducer("Math.Arithmetic.Multiplication", Arithmetic.multiplicationNumeric);
	if (Arithmetic.symbolic) ReductionManager.addReducer("Math.Arithmetic.Multiplication", ReductionManager.itselfReducer);
	if (Arithmetic.symbolic) ReductionManager.addReducer("Math.Arithmetic.Multiplication", Arithmetic.multiplicationNegative);
	if (Arithmetic.symbolic) ReductionManager.addReducer("Math.Arithmetic.Multiplication", Arithmetic.multiplicationNumericAddition);
	
	if (Arithmetic.symbolic) ReductionManager.addReducer("Math.Arithmetic.Division", Arithmetic.divisionNegatives);
	if (Arithmetic.symbolic) ReductionManager.addReducer("Math.Arithmetic.Division", Arithmetic.divisionZeroOne);
	if (Arithmetic.symbolic) ReductionManager.addReducer("Math.Arithmetic.Division", Arithmetic.divisionIntegers);
	ReductionManager.addReducer("Math.Arithmetic.Division", Arithmetic.divisionNumerics);
	if (Arithmetic.symbolic) ReductionManager.addReducer("Math.Arithmetic.Division", Arithmetic.divisionExtractNumerics);
	if (Arithmetic.symbolic) ReductionManager.addReducer("Math.Arithmetic.Division", Arithmetic.divisionExtractNumericsAlone);
	
	ReductionManager.addReducer("Math.Arithmetic.Negative", Arithmetic.negativeSpecials);

	if (Arithmetic.symbolic) ReductionManager.addReducer("Math.Arithmetic.Exponentiation", Arithmetic.exponentiationSpecials);
	if (Arithmetic.symbolic) ReductionManager.addReducer("Math.Arithmetic.Exponentiation", Arithmetic.exponentiationMultiplicationOrDivision);
	if (Arithmetic.symbolic) ReductionManager.addReducer("Math.Arithmetic.Exponentiation", Arithmetic.exponentiationNumericToNegativeInteger);
	if (Arithmetic.symbolic) ReductionManager.addReducer("Math.Arithmetic.Exponentiation", Arithmetic.exponentiationNegativePositiveInteger);
	ReductionManager.addReducer("Math.Arithmetic.Exponentiation", Arithmetic.exponentiationNumerics);
	
	ReductionManager.addReducer("Relation.Compare", Arithmetic.comparisonNumerics);
	
	ReductionManager.addReducer("Math.Arithmetic.Rationalize",   Arithmetic.rationalize);
	ReductionManager.addReducer("Math.Arithmetic.AbsoluteValue", Arithmetic.absNumeric);
	ReductionManager.addReducer("Math.Arithmetic.Sign",          Arithmetic.signNumeric);
	
	ReductionManager.addReducer("Math.Arithmetic.Truncate", Arithmetic.floorCeilingRoundTruncate);
	ReductionManager.addReducer("Math.Arithmetic.Ceiling",  Arithmetic.floorCeilingRoundTruncate);
	ReductionManager.addReducer("Math.Arithmetic.Floor",    Arithmetic.floorCeilingRoundTruncate);
	ReductionManager.addReducer("Math.Arithmetic.Round",    Arithmetic.floorCeilingRoundTruncate);
	
	ReductionManager.addReducer("Math.Arithmetic.Div",    Arithmetic.divMod);
	ReductionManager.addReducer("Math.Arithmetic.Mod",    Arithmetic.divMod);
	ReductionManager.addReducer("Math.Arithmetic.DivMod", Arithmetic.divMod);
	
	ReductionManager.addReducer("Math.Arithmetic.ModularExponentiation"       , Arithmetic.modPow);
	ReductionManager.addReducer("Math.Arithmetic.ModularMultiplicativeInverse", Arithmetic.modInverse);
	
	ReductionManager.addReducer("Math.Trascendental.NaturalLogarithm", Arithmetic.log);
	ReductionManager.addReducer("Math.Trascendental.DecimalLogarithm", Arithmetic.log);
	ReductionManager.addReducer("Math.Trascendental.BinaryLogarithm",  Arithmetic.log);
	ReductionManager.addReducer("Math.Trascendental.Logarithm",        Arithmetic.log);
	
	ReductionManager.addReducer("Math.Arithmetic.SquareRoot", Arithmetic.sqrt);
	
	ReductionManager.addReducer("Math.Trigonometric.Sine",         Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Trigonometric.Cosine",       Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Trigonometric.Tangent",      Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Trigonometric.Cotangent",    Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Trigonometric.Secant",       Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Trigonometric.Cosecant",     Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Trigonometric.ArcSine",      Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Trigonometric.ArcCosine",    Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Trigonometric.ArcTangent",   Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Trigonometric.ArcCotangent", Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Trigonometric.ArcSecant",    Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Trigonometric.ArcCosecant",  Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Trigonometric.ArcTangent2",  Arithmetic.atan2);
	
	ReductionManager.addReducer("Math.Hyperbolic.Sine",            Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Hyperbolic.Cosine",          Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Hyperbolic.Tangent",         Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Hyperbolic.Cotangent",       Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Hyperbolic.Secant",          Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Hyperbolic.Cosecant",        Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Hyperbolic.ArcSine",         Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Hyperbolic.ArcCosine",       Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Hyperbolic.ArcTangent",      Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Hyperbolic.ArcCotangent",    Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Hyperbolic.ArcSecant",       Arithmetic.trigHyper);
	ReductionManager.addReducer("Math.Hyperbolic.ArcCosecant",     Arithmetic.trigHyper);
	
	ReductionManager.addReducer("Math.Arithmetic.IntegerPart",    Arithmetic.integerPart);
	ReductionManager.addReducer("Math.Arithmetic.FractionalPart", Arithmetic.fractionalPart);
	
	ReductionManager.addReducer("Math.Arithmetic.IsRealNumber",     Arithmetic.isX);
	ReductionManager.addReducer("Math.Arithmetic.IsRationalNumber", Arithmetic.isX);
	ReductionManager.addReducer("Math.Arithmetic.IsNumeric",        Arithmetic.isX);
	ReductionManager.addReducer("Math.Arithmetic.IsIntegerValue",   Arithmetic.isX);
	ReductionManager.addReducer("Math.Arithmetic.IsInteger",        Arithmetic.isX);
	ReductionManager.addReducer("Math.Arithmetic.IsDecimal",        Arithmetic.isX);
	ReductionManager.addReducer("Math.Arithmetic.IsNegativeNumber", Arithmetic.isX);
	ReductionManager.addReducer("Math.Arithmetic.IsPositiveNumber", Arithmetic.isX);
	ReductionManager.addReducer("Math.Arithmetic.IsNumberZero",     Arithmetic.isX);
	ReductionManager.addReducer("Math.Arithmetic.IsEven",           Arithmetic.isX);
	ReductionManager.addReducer("Math.Arithmetic.IsOdd",            Arithmetic.isX);
	
	ReductionManager.addReducer("Math.Arithmetic.ToInteger",   Arithmetic.toX);
	ReductionManager.addReducer("Math.Arithmetic.ToIfInteger", Arithmetic.toX);
	ReductionManager.addReducer("Math.Arithmetic.ToDecimal",   Arithmetic.toX);
	ReductionManager.addReducer("Math.Arithmetic.ToNumber",    Arithmetic.toNumber);
	
	ReductionManager.addReducer("Math.Arithmetic.Factorial", Arithmetic.factorial);
	
	ReductionManager.addReducer("String.ToString", Arithmetic.toString);
	ReductionManager.addReducer("Time.ToTime",     Arithmetic.toTime);
	
	ReductionManager.addReducer("Math.Arithmetic.Digits", Arithmetic.digits);
	
	ReductionManager.addReducer("Math.Arithmetic.GreatestCommonDivisor", Arithmetic.gcdLcm);
	ReductionManager.addReducer("Math.Arithmetic.LeastCommonMultiple",   Arithmetic.gcdLcm);
	
	ReductionManager.addReducer("Math.Arithmetic.Factors", Arithmetic.factors);
	
	ReductionManager.addReducer("Math.Arithmetic.Divides",       Arithmetic.divisionTest);
	ReductionManager.addReducer("Math.Arithmetic.DoesNotDivide", Arithmetic.divisionTest);
	
	ReductionManager.addReducer("Math.Arithmetic.Random",        Arithmetic.random);
	ReductionManager.addReducer("Math.Arithmetic.RandomInRange", Arithmetic.randomInRange);
	
	ReductionManager.addReducer("Math.Arithmetic.Piecewise", Arithmetic.piecewise);
	
	ReductionManager.addReducer("Math.Arithmetic.Summation", Arithmetic.summationProductReducer,     true);
	ReductionManager.addReducer("Math.Arithmetic.Summation", Arithmetic.summationProductListReducer, true);
	ReductionManager.addReducer("Math.Arithmetic.Product",   Arithmetic.summationProductReducer    , true);
	ReductionManager.addReducer("Math.Arithmetic.Product",   Arithmetic.summationProductListReducer, true);
};
