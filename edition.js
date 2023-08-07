/*
Fōrmulæ arithmetic package. Module for edition.
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

export class Arithmetic extends Formulae.EditionPackage {};

Arithmetic.editionNumber = function() {
	let number, s;
	
	while (true) {
		s = prompt(Arithmetic.messages.enterNumber, s);
		if (s === null) return;
		try {
			number = s.includes(".") ? new Decimal(s) : BigInt(s);
			break;
		}
		catch (error) {
			continue;
		}
	}
	
	let n = Formulae.createExpression("Math.Number");
	n.set("Value", number);
	
	Formulae.sExpression.replaceBy(n);
	Formulae.sHandler.prepareDisplay();
	Formulae.sHandler.display();
	Formulae.setSelected(Formulae.sHandler, n, false);
}

Arithmetic.actionNumber = {
	isAvailableNow: () => Formulae.sHandler.type != Formulae.ROW_OUTPUT,
	getDescription: () => Arithmetic.messages.actionNumber,
	doAction: () => {
		let s;
		{
			let x = Formulae.sExpression.get("Value");
			if (typeof x === "bigint") {
				s = x.toString();
			}
			else { // Decimal
				if (x.isInteger()) {
					s = x.toFixed() + ".";
				}
				else {
					s = x.toFixed();
				}
			}
		}
		let number;
		
		while (true) {
			s = prompt(Arithmetic.messages.enterNumber, s);
			if (s === null) return;
			try {
				number = s.includes(".") ? new Decimal(s) : BigInt(s);
				break;
			}
			catch (error) {
				continue;
			}
		}
		
		let n = Formulae.createExpression("Math.Number");
		n.set("Value", number);
		
		Formulae.sExpression.replaceBy(n);
		Formulae.sHandler.prepareDisplay();
		Formulae.sHandler.display();
		Formulae.setSelected(Formulae.sHandler, n, false);
	}
};

Arithmetic.editionNegative = function() {
	let negative = Formulae.createExpression("Math.Arithmetic.Negative");
	Formulae.sExpression.replaceBy(negative);
	negative.addChild(Formulae.sExpression);
	Formulae.sHandler.prepareDisplay();
	Formulae.sHandler.display();
	Formulae.setSelected(Formulae.sHandler, Formulae.sExpression, false);
}

Arithmetic.operatorEdition = function(tag, next, forced, negative) {
	let nullExpr = new Expression.Null();
	let newExpr;

	if (negative) {
		newExpr = Formulae.createExpression("Math.Arithmetic.Negative");
		newExpr.addChild(nullExpr);
	}
	else {
		newExpr = nullExpr;
	}
		
	if (!forced && Formulae.sExpression.parent instanceof Expression && Formulae.sExpression.parent.getTag() == tag) {
		Formulae.sExpression.parent.addChildAt(Formulae.sExpression.index + (next ? 1 : 0), newExpr);
	}
	else {
		let expr = Formulae.createExpression(tag);
		Formulae.sExpression.replaceBy(expr);
		expr.addChild(next ? Formulae.sExpression : newExpr);
		expr.addChild(next ? newExpr : Formulae.sExpression);
	}
	
	Formulae.sHandler.prepareDisplay();
	Formulae.sHandler.display();
	Formulae.setSelected(Formulae.sHandler, nullExpr, false);
};

Arithmetic.setEditions = function() {
	Formulae.addEdition(this.messages.pathMath, null, this.messages.leafNumber, Formulae.editionNumber = Arithmetic.editionNumber);

	Formulae.addEdition(this.messages.pathMath, null, this.messages.leafNumeric, () => Expression.wrapperEdition("Math.Numeric"));

	Formulae.addEdition(this.messages.pathMath, null, "∞", () => Expression.replacingEdition("Math.Infinity"));

	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafNegative, Formulae.editionNegative = Arithmetic.editionNegative);

	Formulae.addEdition(this.messages.pathAddition, null, this.messages.leafAdditionAfter,        Formulae.editionAddition = () => Arithmetic.operatorEdition("Math.Arithmetic.Addition", true,  false, false));
	Formulae.addEdition(this.messages.pathAddition, null, this.messages.leafAdditionAfterForced,  () => Arithmetic.operatorEdition("Math.Arithmetic.Addition", true,  true,  false));
	Formulae.addEdition(this.messages.pathAddition, null, this.messages.leafAdditionBefore,       Formulae.editionAdditionAlt = () => Arithmetic.operatorEdition("Math.Arithmetic.Addition", false, false, false));
	Formulae.addEdition(this.messages.pathAddition, null, this.messages.leafAdditionBeforeForced, () => Arithmetic.operatorEdition("Math.Arithmetic.Addition", false, true,  false));

	Formulae.addEdition(this.messages.pathSubtraction, null, this.messages.leafSubtractionAfter,        Formulae.editionSubtraction = () => Arithmetic.operatorEdition("Math.Arithmetic.Addition", true,  false, true));
	Formulae.addEdition(this.messages.pathSubtraction, null, this.messages.leafSubtractionAfterForced,  () => Arithmetic.operatorEdition("Math.Arithmetic.Addition", true,  true,  true));
	Formulae.addEdition(this.messages.pathSubtraction, null, this.messages.leafSubtractionBefore,       Formulae.aditionSubtractionAlt = () => Arithmetic.operatorEdition("Math.Arithmetic.Addition", false, false, true));
	Formulae.addEdition(this.messages.pathSubtraction, null, this.messages.leafSubtractionBeforeForced, () => Arithmetic.operatorEdition("Math.Arithmetic.Addition", false, true,  true));

	Formulae.addEdition(this.messages.pathMultiplication, null, this.messages.leafMultiplicationAfter,       Formulae.editionMultiplication = () => Arithmetic.operatorEdition("Math.Arithmetic.Multiplication", true,  false, false));
	Formulae.addEdition(this.messages.pathMultiplication, null, this.messages.leafMultiplicationAfterForced, () => Arithmetic.operatorEdition("Math.Arithmetic.Multiplication", true,  true,  false));
	Formulae.addEdition(this.messages.pathMultiplication, null, this.messages.leafMultiplicationBefore,      Formulae.editionMultiplicationAlt = () => Arithmetic.operatorEdition("Math.Arithmetic.Multiplication", false, false, false));
	Formulae.addEdition(this.messages.pathMultiplication, null, this.messages.leafMultiplicationBeforeForced, () => Arithmetic.operatorEdition("Math.Arithmetic.Multiplication", false, true,  false));

	Formulae.addEdition(this.messages.pathDivision, null, this.messages.leafDenominator, () => Expression.binaryEdition("Math.Arithmetic.Division", false));
	Formulae.addEdition(this.messages.pathDivision, null, this.messages.leafNumerator,   () => Expression.binaryEdition("Math.Arithmetic.Division", true));

	Formulae.addEdition(this.messages.pathExponentiation, null, this.messages.leafExponent, () => Expression.binaryEdition("Math.Arithmetic.Exponentiation", false));
	Formulae.addEdition(this.messages.pathExponentiation, null, this.messages.leafBase,     () => Expression.binaryEdition("Math.Arithmetic.Exponentiation", true));

	Formulae.addEdition(this.messages.pathPrecision, null, this.messages.leafPrecision,       () => Expression.wrapperEdition("Math.Arithmetic.Precision"));
	Formulae.addEdition(this.messages.pathPrecision, null, this.messages.leafSetMaxPrecision, () => Expression.wrapperEdition("Math.Arithmetic.SetMaxPrecision"));
	Formulae.addEdition(this.messages.pathPrecision, null, this.messages.leafGetMaxPrecision, () => Expression.replacingEdition("Math.Arithmetic.GetMaxPrecision"));
	
	// rounding modes
	Formulae.addEdition(this.messages.PathRoundingMode, null, this.messages.leafSetRoundingMode, () => Expression.wrapperEdition("Math.Arithmetic.SetRoundingMode"));
	Formulae.addEdition(this.messages.PathRoundingMode, null, this.messages.leafGetRoundingMode, () => Expression.replacingEdition("Math.Arithmetic.GetRoundingMode"));
	
	[
		            "TowardsZero",             "AwayFromZero",             "TowardsMinusInfinity",             "TowardsInfinity",
		"Nearest.HalfTowardsZero", "Nearest.HalfAwayFromZero", "Nearest.HalfTowardsMinusInfinity", "Nearest.HalfTowardsInfinity",
		"Nearest.HalfEven"
	].forEach(tag => {
		Formulae.addEdition(
			Arithmetic.messages.PathRoundingModes,
			null,
			Arithmetic.messages["labelRoundingMode" + tag],
			() => Expression.replacingEdition("Math.Arithmetic.RoundingMode." + tag)
		)
	});
	
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafRationalize,   () => Expression.wrapperEdition("Math.Arithmetic.Rationalize"));
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafSquareRoot,    () => Expression.wrapperEdition("Math.Arithmetic.SquareRoot"));
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafFactorial,     () => Expression.wrapperEdition("Math.Arithmetic.Factorial"));
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafAbsoluteValue, () => Expression.wrapperEdition("Math.Arithmetic.AbsoluteValue"));
	
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafTruncate,      () => Expression.wrapperEdition("Math.Arithmetic.Truncate"));
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafRound   ,      () => Expression.wrapperEdition("Math.Arithmetic.Round"));
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafFloor,         () => Expression.wrapperEdition("Math.Arithmetic.Floor"));
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafCeiling,       () => Expression.wrapperEdition("Math.Arithmetic.Ceiling"));
	
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafSign,           () => Expression.wrapperEdition("Math.Arithmetic.Sign"));
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafIntegerPart,    () => Expression.wrapperEdition("Math.Arithmetic.IntegerPart"));
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafFractionalPart, () => Expression.wrapperEdition("Math.Arithmetic.FractionalPart"));
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafDecimalPlaces,  () => Expression.wrapperEdition("Math.Arithmetic.DecimalPlaces"));
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafFactors,        () => Expression.wrapperEdition("Math.Arithmetic.Factors"));
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafDigits,         () => Expression.wrapperEdition("Math.Arithmetic.Digits"));
	
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafGreatestCommonDivisor, () => Expression.wrapperEdition("Math.Arithmetic.GreatestCommonDivisor"));
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafLeastCommonMultiple,   () => Expression.wrapperEdition("Math.Arithmetic.LeastCommonMultiple"));
	
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafRandom,          () => Expression.replacingEdition("Math.Arithmetic.Random"));
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafRandomPrecision, () => Expression.wrapperEdition("Math.Arithmetic.Random"));
	
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafRandomInRange,  () => Expression.binaryEdition   ("Math.Arithmetic.RandomInRange", false));

	Formulae.addEdition(this.messages.pathTesting, null, this.messages.leafIsRealNumber,     () => Expression.wrapperEdition("Math.Arithmetic.IsRealNumber"));
	Formulae.addEdition(this.messages.pathTesting, null, this.messages.leafIsRationalNumber, () => Expression.wrapperEdition("Math.Arithmetic.IsRationalNumber"));
	Formulae.addEdition(this.messages.pathTesting, null, this.messages.leafIsNumeric,        () => Expression.wrapperEdition("Math.Arithmetic.IsNumeric"));
	Formulae.addEdition(this.messages.pathTesting, null, this.messages.leafIsIntegerValue,   () => Expression.wrapperEdition("Math.Arithmetic.IsIntegerValue"));
	Formulae.addEdition(this.messages.pathTesting, null, this.messages.leafIsInteger,        () => Expression.wrapperEdition("Math.Arithmetic.IsInteger"));
	Formulae.addEdition(this.messages.pathTesting, null, this.messages.leafIsDecimal,        () => Expression.wrapperEdition("Math.Arithmetic.IsDecimal"));
	Formulae.addEdition(this.messages.pathTesting, null, this.messages.leafIsPositiveNumber, () => Expression.wrapperEdition("Math.Arithmetic.IsPositiveNumber"));
	Formulae.addEdition(this.messages.pathTesting, null, this.messages.leafIsNegativeNumber, () => Expression.wrapperEdition("Math.Arithmetic.IsNegativeNumber"));
	Formulae.addEdition(this.messages.pathTesting, null, this.messages.leafIsNumberZero,     () => Expression.wrapperEdition("Math.Arithmetic.IsNumberZero"));
	Formulae.addEdition(this.messages.pathTesting, null, this.messages.leafIsEven,           () => Expression.wrapperEdition("Math.Arithmetic.IsEven"));
	Formulae.addEdition(this.messages.pathTesting, null, this.messages.leafIsOdd,            () => Expression.wrapperEdition("Math.Arithmetic.IsOdd"));
	Formulae.addEdition(this.messages.pathTesting, null, this.messages.leafIsPrime,          () => Expression.wrapperEdition("Math.Arithmetic.IsPrime"));

	Formulae.addEdition(this.messages.pathTesting, null, this.messages.leafDivides,          () => Expression.binaryEdition("Math.Arithmetic.Divides",       false));
	Formulae.addEdition(this.messages.pathTesting, null, this.messages.leafDoesNotDivide,    () => Expression.binaryEdition("Math.Arithmetic.DoesNotDivide", false));

	Formulae.addEdition(this.messages.pathConversion, null, this.messages.leafToInteger,     () => Expression.wrapperEdition("Math.Arithmetic.ToInteger"));
	Formulae.addEdition(this.messages.pathConversion, null, this.messages.leafToIfInteger,   () => Expression.wrapperEdition("Math.Arithmetic.ToIfInteger"));
	Formulae.addEdition(this.messages.pathConversion, null, this.messages.leafToDecimal,     () => Expression.wrapperEdition("Math.Arithmetic.ToDecimal"));
	Formulae.addEdition(this.messages.pathConversion, null, this.messages.leafToNumber,      () => Expression.wrapperEdition("Math.Arithmetic.ToNumber"));

	Formulae.addEdition(this.messages.pathEuclideanDivision, null, this.messages.leafDiv,    () => Expression.binaryEdition("Math.Arithmetic.Div", false));
	Formulae.addEdition(this.messages.pathEuclideanDivision, null, this.messages.leafMod,    () => Expression.binaryEdition("Math.Arithmetic.Mod", false));
	Formulae.addEdition(this.messages.pathEuclideanDivision, null, this.messages.leafDivMod, () => Expression.binaryEdition("Math.Arithmetic.DivMod", false));
	
	Formulae.addEdition(this.messages.PathEuclideanDivisionMode, null, this.messages.leafSetEuclideanDivisionMode, () => Expression.wrapperEdition("Math.Arithmetic.SetEuclideanDivisionMode"));
	Formulae.addEdition(this.messages.PathEuclideanDivisionMode, null, this.messages.leafGetEuclideanDivisionMode, () => Expression.replacingEdition("Math.Arithmetic.GetEuclideanDivisionMode"));
	Formulae.addEdition(this.messages.PathEuclideanDivisionMode, null, this.messages.leafEuclideanMode, () => Expression.replacingEdition("Math.Arithmetic.EuclideanMode"));
	
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafModularExponentiation,        () => Expression.multipleEdition("Math.Arithmetic.ModularExponentiation", 3, 0));
	Formulae.addEdition(this.messages.pathArithmetic, null, this.messages.leafModularMultiplicativeInverse, () => Expression.multipleEdition("Math.Arithmetic.ModularMultiplicativeInverse", 2, 0));
	Formulae.addEdition(this.messages.pathArithmetic, null, "Piecewise", () => Expression.multipleEdition("Math.Arithmetic.Piecewise", 2, 0));

	[ 4, 5, 3, 2 ].forEach(type => {
		Formulae.addEdition(
			Arithmetic.messages.pathSummation, "packages/org.formulae.math.arithmetic/img/summation" + type + ".png", null,
			() => Expression.multipleEdition("Math.Arithmetic.Summation", type, 0)
		);
		Formulae.addEdition(
			Arithmetic.messages.pathProduct, "packages/org.formulae.math.arithmetic/img/product" + type + ".png", null,
			() => Expression.multipleEdition("Math.Arithmetic.Product", type, 0)
		);
	});

	Formulae.addEdition(this.messages.pathTrascendental, null, this.messages.leafDecimalLogarithm, () => Expression.wrapperEdition("Math.Trascendental.DecimalLogarithm"));
	Formulae.addEdition(this.messages.pathTrascendental, null, this.messages.leafNaturalLogarithm, () => Expression.wrapperEdition("Math.Trascendental.NaturalLogarithm"));
	Formulae.addEdition(this.messages.pathTrascendental, null, this.messages.leafBinaryLogarithm,  () => Expression.wrapperEdition("Math.Trascendental.BinaryLogarithm"));

	Formulae.addEdition(this.messages.pathTrascendental, null, this.messages.leafLogarithm,        () => Expression.binaryEdition("Math.Trascendental.Logarithm", false));

	[ "Sine", "Cosine", "Tangent", "Cotangent", "Secant", "Cosecant", "ArcSine", "ArcCosine", "ArcTangent", "ArcCotangent", "ArcSecant", "ArcCosecant" ].forEach(tag => {
		Formulae.addEdition(this.messages.pathTrigonometric, null, Arithmetic.messages["leaf" + tag], () => Expression.wrapperEdition("Math.Trigonometric." + tag));
		Formulae.addEdition(this.messages.pathHyperbolic,    null, Arithmetic.messages["leaf" + tag], () => Expression.wrapperEdition("Math.Hyperbolic." + tag));
	});
	
	Formulae.addEdition(this.messages.pathTrigonometric, null, Arithmetic.messages.leafArcTangent2, () => Expression.binaryEdition("Math.Trigonometric.ArcTangent2"));

	Formulae.addEdition(this.messages.pathConstant, null, "π", () => Expression.replacingEdition("Math.Constant.Pi"));
	Formulae.addEdition(this.messages.pathConstant, null, "e", () => Expression.replacingEdition("Math.Constant.Euler"));

	Formulae.addEdition(this.messages.pathComplex, null, "ℹ",                         () => Expression.replacingEdition("Math.Complex.Imaginary"));
	Formulae.addEdition(this.messages.pathComplex, null, this.messages.leafConjugate, () => Expression.wrapperEdition("Math.Complex.Conjugate"));
};

Arithmetic.setActions = function() {
	Formulae.addAction("Math.Number", Arithmetic.actionNumber);
};
