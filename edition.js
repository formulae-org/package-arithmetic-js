/*
Fōrmulæ arithmetic package. Module for edition.
Copyright (C) 2015-2026 Laurence R. Ugalde

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

"use strict";

export class ArithmeticPackage extends Formulae.EditionPackage {};

const editionNumber = function() {
	let number, s;
	
	while (true) {
		s = prompt(ArithmeticPackage.messages.enterNumber, s);
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

const actionNumber = {
	isAvailableNow: () => Formulae.sHandler.type != Formulae.ROW_OUTPUT,
	getDescription: () => ArithmeticPackage.messages.actionNumber,
	doAction: () => {
		let s;
		{
			let x = Formulae.sExpression.get("Value");
			//if (typeof x === "bigint") {
			if (x.constructor === BigInt) {
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
			s = prompt(ArithmeticPackage.messages.enterNumber, s);
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

const editionNegative = function() {
	let negative = Formulae.createExpression("Math.Arithmetic.Negative");
	Formulae.sExpression.replaceBy(negative);
	negative.addChild(Formulae.sExpression);
	Formulae.sHandler.prepareDisplay();
	Formulae.sHandler.display();
	Formulae.setSelected(Formulae.sHandler, Formulae.sExpression, false);
}

const operatorEdition = function(tag, next, forced, negative) {
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

ArithmeticPackage.setEditions = function() {
	// Number
	
	Formulae.addEdition(this.messages.pathMath, this.messages.leafNumber, this.messages.leafNumber, Formulae.editionNumber = editionNumber);
	
	// Infinity
	
	Formulae.addEdition(this.messages.pathMath, "∞", this.messages.nameInfinity, () => Expression.replacingEdition("Math.Infinity"));
	
	// Negative
	
	Formulae.addEdition(
		this.messages.pathArithmetic,
		'<expression tag="Math.Arithmetic.Negative"><expression tag="Visualization.Selected"><expression tag="Null"/></expression></expression>',
		this.messages.leafNegative,
		Formulae.editionNegative = editionNegative
	);
	
	// Addition
	
	Formulae.addEdition(
		this.messages.pathAddition,
		'<expression tag="Math.Arithmetic.Addition"><expression tag="Visualization.Selected"><expression tag="Null"/></expression><expression tag="Null"/></expression>',
		this.messages.leafAdditionAfter,
		Formulae.editionAddition = () => operatorEdition("Math.Arithmetic.Addition", true,  false, false)
	);
	
	Formulae.addEdition(
		this.messages.pathAddition,
		'<expression tag="Math.Arithmetic.Addition"><expression tag="Visualization.Selected"><expression tag="Null"/></expression><expression tag="Visualization.HorizontalArray"><expression tag="Null"/><expression tag="String.Text" Value="!"/></expression></expression>',
		this.messages.leafAdditionAfterForced,
		() => operatorEdition("Math.Arithmetic.Addition", true,  true,  false)
	);
	
	Formulae.addEdition(
		this.messages.pathAddition,
		'<expression tag="Math.Arithmetic.Addition"><expression tag="Null"/><expression tag="Visualization.Selected"><expression tag="Null"/></expression></expression>',
		this.messages.leafAdditionBefore,
		Formulae.editionAdditionAlt = () => operatorEdition("Math.Arithmetic.Addition", false, false, false)
	);
	
	Formulae.addEdition(
		this.messages.pathAddition,
		'<expression tag="Math.Arithmetic.Addition"><expression tag="Visualization.HorizontalArray"><expression tag="Null"/><expression tag="String.Text" Value="!"/></expression><expression tag="Visualization.Selected"><expression tag="Null"/></expression></expression>',
		this.messages.leafAdditionBeforeForced,
		() => operatorEdition("Math.Arithmetic.Addition", false, true,  false)
	);
	
	// Subtraction
	
	Formulae.addEdition(
		this.messages.pathSubtraction,
		'<expression tag="Math.Arithmetic.Addition"><expression tag="Visualization.Selected"><expression tag="Null"/></expression><expression tag="Math.Arithmetic.Negative"><expression tag="Null"/></expression></expression>',
		this.messages.leafSubtractionAfter,
		Formulae.editionSubtraction = () => operatorEdition("Math.Arithmetic.Addition", true,  false, true)
	);
	
	Formulae.addEdition(
		this.messages.pathSubtraction,
		'<expression tag="Math.Arithmetic.Addition"><expression tag="Visualization.Selected"><expression tag="Null"/></expression><expression tag="Math.Arithmetic.Negative"><expression tag="Visualization.HorizontalArray"><expression tag="Null"/><expression tag="String.Text" Value="!"/></expression></expression></expression>',
		this.messages.leafSubtractionAfterForced,
		() => operatorEdition("Math.Arithmetic.Addition", true,  true,  true)
	);
	
	Formulae.addEdition(
		this.messages.pathSubtraction,
		'<expression tag="Math.Arithmetic.Addition"><expression tag="Null"/><expression tag="Math.Arithmetic.Negative"><expression tag="Visualization.Selected"><expression tag="Null"/></expression></expression></expression>',
		this.messages.leafSubtractionBefore,
		Formulae.aditionSubtractionAlt = () => operatorEdition("Math.Arithmetic.Addition", false, false, true)
	);
	
	Formulae.addEdition(
		this.messages.pathSubtraction,
		'<expression tag="Math.Arithmetic.Addition"><expression tag="Visualization.HorizontalArray"><expression tag="Null"/><expression tag="String.Text" Value="!"/></expression><expression tag="Math.Arithmetic.Negative"><expression tag="Visualization.Selected"><expression tag="Null"/></expression></expression></expression>',
		this.messages.leafSubtractionBeforeForced,
		() => operatorEdition("Math.Arithmetic.Addition", false, true,  true)
	);
	
	// Multiplication
	
	Formulae.addEdition(
		this.messages.pathMultiplication,
		'<expression tag="Math.Arithmetic.Multiplication"><expression tag="Visualization.Selected"><expression tag="Null"/></expression><expression tag="Null"/></expression>',
		this.messages.leafMultiplicationAfter,
		Formulae.editionMultiplication = () => operatorEdition("Math.Arithmetic.Multiplication", true,  false, false)
	);
	
	Formulae.addEdition(
		this.messages.pathMultiplication,
		'<expression tag="Math.Arithmetic.Multiplication"><expression tag="Visualization.Selected"><expression tag="Null"/></expression><expression tag="Visualization.HorizontalArray"><expression tag="Null"/><expression tag="String.Text" Value="!"/></expression></expression>',
		this.messages.leafMultiplicationAfterForced,
		() => operatorEdition("Math.Arithmetic.Multiplication", true,  true,  false)
	);
	
	Formulae.addEdition(
		this.messages.pathMultiplication,
		'<expression tag="Math.Arithmetic.Multiplication"><expression tag="Null"/><expression tag="Visualization.Selected"><expression tag="Null"/></expression></expression>',
		this.messages.leafMultiplicationBefore,
		Formulae.editionMultiplicationAlt = () => operatorEdition("Math.Arithmetic.Multiplication", false, false, false)
	);
	
	Formulae.addEdition(
		this.messages.pathMultiplication,
		'<expression tag="Math.Arithmetic.Multiplication"><expression tag="Visualization.HorizontalArray"><expression tag="Null"/><expression tag="String.Text" Value="!"/></expression><expression tag="Visualization.Selected"><expression tag="Null"/></expression></expression>',
		this.messages.leafMultiplicationBeforeForced,
		() => operatorEdition("Math.Arithmetic.Multiplication", false, true,  false)
	);
	
	// Division
	
	Formulae.addBinaryEditions(this.messages, "Division", "Denominator", "Numerator", "Math.Arithmetic.Division");
	
	// Exponentiation
	
	Formulae.addBinaryEditions(this.messages, "Exponentiation", "Exponent", "Base", "Math.Arithmetic.Exponentiation");
	
	// Precision
	
	[ "SignificantDigits", "SetPrecision" ].forEach(tag => {
		Formulae.addEdition(
			this.messages.pathPrecision,
			`<expression tag="Math.Arithmetic.${tag}"><expression tag="Visualization.Selected"><expression tag="Null"/></expression></expression>`,
			this.messages[ "leaf" + tag],
			() => Expression.wrapperEdition("Math.Arithmetic." + tag)
		);
	});
	
	Formulae.addEdition(
		this.messages.pathPrecision,
		'<expression tag="Math.Arithmetic.GetPrecision"/>',
		this.messages.leafGetPrecision,
		() => Expression.replacingEdition("Math.Arithmetic.GetPrecision")
	);
	
	Formulae.addBinaryEdition(this.messages, "Precision", "WithPrecision", "Math.Arithmetic.WithPrecision");
	
	// rounding mode
	
	Formulae.addEdition(
		this.messages.pathRoundingMode,
		'<expression tag="Math.Arithmetic.RoundingModes"/>',
		this.messages.leafRoundingModes,
		() => Expression.replacingEdition("Math.Arithmetic.RoundingModes")
	);
	
	Formulae.addEdition(
		this.messages.pathRoundingMode,
		'<expression tag="Math.Arithmetic.SetRoundingMode"><expression tag="Visualization.Selected"><expression tag="Null"/></expression></expression>',
		this.messages.leafSetRoundingMode,
		() => Expression.wrapperEdition("Math.Arithmetic.SetRoundingMode")
	);
	
	Formulae.addEdition(
		this.messages.pathRoundingMode,
		'<expression tag="Math.Arithmetic.GetRoundingMode"/>',
		this.messages.leafGetRoundingMode,
		() => Expression.replacingEdition("Math.Arithmetic.GetRoundingMode")
	);
	
	Formulae.addBinaryEdition(this.messages, "RoundingMode", "WithRoundingMode", "Math.Arithmetic.WithRoundingMode");
	
	[
		            "TowardsZero",             "AwayFromZero",             "TowardsMinusInfinity",             "TowardsInfinity",
		"Nearest.HalfTowardsZero", "Nearest.HalfAwayFromZero", "Nearest.HalfTowardsMinusInfinity", "Nearest.HalfTowardsInfinity",
		"Nearest.HalfEven"
	].forEach(tag => {
		Formulae.addEdition(
			ArithmeticPackage.messages.pathRoundingModes,
			`<expression tag="Math.Arithmetic.RoundingMode.${tag}"/>`,
			ArithmeticPackage.messages["labelRoundingMode" + tag],
			() => Expression.replacingEdition("Math.Arithmetic.RoundingMode." + tag)
		)
	});
	
	// numeric mode
	
	Formulae.addEdition(
		this.messages.pathNumeric,
		'<expression tag="Math.Arithmetic.SetNumericMode"><expression tag="Visualization.Selected"><expression tag="Null"/></expression></expression>',
		this.messages.leafSetNumericMode,
		() => Expression.wrapperEdition("Math.Arithmetic.SetNumericMode")
	);
	
	Formulae.addEdition(
		this.messages.pathNumeric,
		'<expression tag="Math.Arithmetic.InNumericMode"/>',
		this.messages.leafInNumericMode,
		() => Expression.replacingEdition("Math.Arithmetic.InNumericMode")
	);
	
	Formulae.addEdition(
		this.messages.pathNumeric,
		'<expression tag="Math.Arithmetic.Numeric"><expression tag="Visualization.Selected"><expression tag="Null"/></expression></expression>',
		this.messages.leafNumeric,
		() => Expression.wrapperEdition("Math.Arithmetic.Numeric")
	);
	
	// rounding
	
	Formulae.addEdition(
		this.messages.pathRounding,
		'<expression tag="Math.Arithmetic.RoundToPrecision"><expression tag="Visualization.Selected"><expression tag="Null"/></expression><expression tag="Null"/></expression>',
		this.messages.leafRoundToPrecision,
		() => Expression.multipleEdition("Math.Arithmetic.RoundToPrecision", 2, 0)
	);
	
	Formulae.addEdition(
		this.messages.pathRounding,
		'<expression tag="Math.Arithmetic.RoundToInteger"><expression tag="Visualization.Selected"><expression tag="Null"/></expression></expression>',
		this.messages.leafRoundToInteger,
		() => Expression.wrapperEdition ("Math.Arithmetic.RoundToInteger")
	);
	
	Formulae.addEdition(
		this.messages.pathRounding,
		'<expression tag="Math.Arithmetic.RoundToDecimalPlaces"><expression tag="Visualization.Selected"><expression tag="Null"/></expression><expression tag="Null"/></expression>',
		this.messages.leafRoundToDecimalPlaces,
		() => Expression.multipleEdition("Math.Arithmetic.RoundToDecimalPlaces", 2, 0)
	);
	
	Formulae.addEdition(
		this.messages.pathRounding,
		'<expression tag="Math.Arithmetic.RoundToMultiple"><expression tag="Visualization.Selected"><expression tag="Null"/></expression><expression tag="Null"/></expression>',
		this.messages.leafRoundToMultiple,
		() => Expression.multipleEdition("Math.Arithmetic.RoundToMultiple", 2, 0)
	);
	
	// Binomial coefficient
	
	Formulae.addBinaryEditions(this.messages, "BinomialCoefficient", "LowerIndex", "UpperIndex", "Math.Arithmetic.BinomialCoefficient");
	
	// Wrappers
	
	Formulae.addWrapperEditions(
		this.messages,
		"Arithmetic",
		"Math.Arithmetic",
		[
			"Rationalize", "SquareRoot", "Factorial",
			"AbsoluteValue", "Floor", "Ceiling", "Truncate", "Round",
			"Sign", "IntegerPart", "FractionalPart", "DecimalPlaces", "Factors", "FactorsWithExponents", "Divisors", "ProperDivisors", "Digits",
			"GreatestCommonDivisor", "LeastCommonMultiple"
		]
	);
	
	// Random
	
	Formulae.addEdition(
		this.messages.pathArithmetic,
		'<expression tag="Math.Arithmetic.Random"/>',
		this.messages.leafRandom,
		() => Expression.replacingEdition("Math.Arithmetic.Random")
	);
	Formulae.addEdition(
		this.messages.pathArithmetic,
		'<expression tag="Math.Arithmetic.Random"><expression tag="Visualization.Selected"><expression tag="Null"/></expression></expression>',
		this.messages.leafRandomPrecision,
		() => Expression.wrapperEdition("Math.Arithmetic.Random")
	);
	Formulae.addEdition(
		this.messages.pathArithmetic,
		'<expression tag="Math.Arithmetic.RandomInRange"><expression tag="Visualization.Selected"><expression tag="Null"/></expression><expression tag="Null"/></expression>',
		this.messages.leafRandomInRange,
		() => Expression.binaryEdition("Math.Arithmetic.RandomInRange", false)
	);
	
	// Parts of rational
	
	Formulae.addWrapperEditions(this.messages, "Arithmetic", "Math.Arithmetic", [ "Numerator", "Denominator" ]);
	
	// Predicates for tests
	
	Formulae.addWrapperEditions(
		this.messages,
		"Testing",
		"Math.Arithmetic",
		[
			"IsRealNumber", "IsRationalNumber", "IsNumeric", "IsIntegerValue", "IsInteger", "IsDecimal",
			"IsPositiveNumber", "IsNegativeNumber", "IsNumberZero", "IsEven", "IsOdd", "IsPrime"
		]
	);
	
	// Division tests
	
	[ "Divides", "DoesNotDivide" ].forEach(tag => Formulae.addBinaryEdition(this.messages, "Testing", tag, "Math.Arithmetic." + tag));
	
	// Conversion
	
	Formulae.addWrapperEditions(this.messages, "Conversion", "Math.Arithmetic", [ "ToInteger", "ToIfInteger", "ToDecimal", "ToNumber" ]);
	
	// Euclidean division
	
	[ "Div", "Mod", "DivMod" ].forEach(tag => Formulae.addBinaryEdition(this.messages, "EuclideanDivision", tag, "Math.Arithmetic." + tag));
	
	// Modular operations
	
	Formulae.addEdition(
		this.messages.pathArithmetic,
		'<expression tag="Math.Arithmetic.ModularExponentiation"><expression tag="Visualization.Selected"><expression tag="Null"/></expression><expression tag="Null"/><expression tag="Null"/></expression>',
		this.messages.leafModularExponentiation,
		() => Expression.multipleEdition("Math.Arithmetic.ModularExponentiation", 3, 0)
	);
	
	Formulae.addEdition(
		this.messages.pathArithmetic,
		'<expression tag="Math.Arithmetic.ModularMultiplicativeInverse"><expression tag="Visualization.Selected"><expression tag="Null"/></expression><expression tag="Null"/></expression>',
		this.messages.leafModularMultiplicativeInverse,
		() => Expression.multipleEdition("Math.Arithmetic.ModularMultiplicativeInverse", 2, 0)
	);
	
	// Pieceswise
	
	Formulae.addEdition(
		this.messages.pathArithmetic,
		'<expression tag="Math.Arithmetic.Piecewise"><expression tag="Visualization.Selected"><expression tag="Null"/></expression><expression tag="Null"/><expression tag="Null"/></expression>',
		this.messages.leafPiecewise,
		() => Expression.multipleEdition("Math.Arithmetic.Piecewise", 2, 0)
	);
	
	// Summation, product
	
	const sumLeaf  = { 2: "leafSummationCount", 3: "leafSummationList", 4: "leafSummationRange", 5: "leafSummationRangeStep" };
	const prodLeaf = { 2: "leafProductCount",   3: "leafProductList",   4: "leafProductRange",   5: "leafProductRangeStep"   };

	[ 4, 5, 3, 2 ].forEach(type => {
		let sum = '<expression tag="Math.Arithmetic.Summation"><expression tag="Visualization.Selected"><expression tag="Null"/></expression>';
		let product = '<expression tag="Math.Arithmetic.Product"><expression tag="Visualization.Selected"><expression tag="Null"/></expression>';
		for (let i = 1; i < type; ++i) {
			sum += '<expression tag="Null"/>';
			product += '<expression tag="Null"/>';
		}
		sum += '</expression>';
		product += '</expression>';
		
		Formulae.addEdition(
			ArithmeticPackage.messages.pathSummation,
			sum,
			ArithmeticPackage.messages[sumLeaf[type]],
			() => Expression.multipleEdition("Math.Arithmetic.Summation", type, 0)
		);
		
		Formulae.addEdition(
			ArithmeticPackage.messages.pathProduct,
			product,
			ArithmeticPackage.messages[prodLeaf[type]],
			() => Expression.multipleEdition("Math.Arithmetic.Product", type, 0)
		);
	});
	
	// Transcendental functions
	
	Formulae.addWrapperEditions(this.messages, "Transcendental", "Math.Transcendental", [ "DecimalLogarithm", "NaturalLogarithm", "BinaryLogarithm" ]);
	Formulae.addBinaryEdition(this.messages, "Transcendental", "Logarithm", "Math.Transcendental.Logarithm");
	
	// Trigonometric and hyperbolic functions, and their inverses
	
	let functions = [
		"Sine",    "Cosine",    "Tangent",    "Cotangent",    "Secant",    "Cosecant",
		"ArcSine", "ArcCosine", "ArcTangent", "ArcCotangent", "ArcSecant", "ArcCosecant"
	];
	Formulae.addWrapperEditions(this.messages, "Trigonometric", "Math.Trigonometric", functions);
	Formulae.addWrapperEditions(this.messages, "Hyperbolic",    "Math.Hyperbolic",    functions);
	
	Formulae.addBinaryEdition(this.messages, "Trigonometric", "ArcTangent2", "Math.Trigonometric.ArcTangent2");
	
	// Constants
	
	Formulae.addEdition(this.messages.pathConstant, "π", this.messages.namePi, () => Expression.replacingEdition("Math.Constant.Pi"));
	Formulae.addEdition(this.messages.pathConstant, "e", this.messages.nameE,  () => Expression.replacingEdition("Math.Constant.Euler"));
};

ArithmeticPackage.setActions = function() {
	Formulae.addAction("Math.Number", actionNumber);
};

