/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { describe, it } from 'mocha';
import { expectPassesRule, expectFailsRule } from './harness';
import {
  KnownDirectives,
  unknownDirectiveMessage,
  misplacedDirectiveMessage,
} from '../rules/KnownDirectives';

function unknownDirective(directiveName, line, column) {
  return {
    message: unknownDirectiveMessage(directiveName),
    locations: [{ line, column }],
  };
}

function misplacedDirective(directiveName, placement, line, column) {
  return {
    message: misplacedDirectiveMessage(directiveName, placement),
    locations: [{ line, column }],
  };
}

describe('Validate: Known directives', () => {
  it('with no directives', () => {
    expectPassesRule(
      KnownDirectives,
      `
      query Foo {
        name
        ...Frag
      }

      fragment Frag on Dog {
        name
      }
    `,
    );
  });

  it('with known directives', () => {
    expectPassesRule(
      KnownDirectives,
      `
      {
        dog @include(if: true) {
          name
        }
        human @skip(if: false) {
          name
        }
      }
    `,
    );
  });

  it('with unknown directive', () => {
    expectFailsRule(
      KnownDirectives,
      `
      {
        dog @unknown(directive: "value") {
          name
        }
      }
    `,
      [unknownDirective('unknown', 3, 13)],
    );
  });

  it('with many unknown directives', () => {
    expectFailsRule(
      KnownDirectives,
      `
      {
        dog @unknown(directive: "value") {
          name
        }
        human @unknown(directive: "value") {
          name
          pets @unknown(directive: "value") {
            name
          }
        }
      }
    `,
      [
        unknownDirective('unknown', 3, 13),
        unknownDirective('unknown', 6, 15),
        unknownDirective('unknown', 8, 16),
      ],
    );
  });

  it('with well placed directives', () => {
    expectPassesRule(
      KnownDirectives,
      `
      query Foo($var: Boolean @onVariableDefinition) @onQuery {
        name @include(if: $var)
        ...Frag @include(if: true)
        skippedField @skip(if: true)
        ...SkippedFrag @skip(if: true)
      }

      mutation Bar @onMutation {
        someField
      }
    `,
    );
  });

  it('with misplaced directives', () => {
    expectFailsRule(
      KnownDirectives,
      `
      query Foo($var: Boolean @onField) @include(if: true) {
        name @onQuery @include(if: $var)
        ...Frag @onQuery
      }

      mutation Bar @onQuery {
        someField
      }
    `,
      [
        misplacedDirective('onField', 'VARIABLE_DEFINITION', 2, 31),
        misplacedDirective('include', 'QUERY', 2, 41),
        misplacedDirective('onQuery', 'FIELD', 3, 14),
        misplacedDirective('onQuery', 'FRAGMENT_SPREAD', 4, 17),
        misplacedDirective('onQuery', 'MUTATION', 7, 20),
      ],
    );
  });

  describe('within schema language', () => {
    it('with well placed directives', () => {
      expectPassesRule(
        KnownDirectives,
        `
        type MyObj implements MyInterface @onObject {
          myField(myArg: Int @onArgumentDefinition): String @onFieldDefinition
        }

        extend type MyObj @onObject

        scalar MyScalar @onScalar

        extend scalar MyScalar @onScalar

        interface MyInterface @onInterface {
          myField(myArg: Int @onArgumentDefinition): String @onFieldDefinition
        }

        extend interface MyInterface @onInterface

        union MyUnion @onUnion = MyObj | Other

        extend union MyUnion @onUnion

        enum MyEnum @onEnum {
          MY_VALUE @onEnumValue
        }

        extend enum MyEnum @onEnum

        input MyInput @onInputObject {
          myField: Int @onInputFieldDefinition
        }

        extend input MyInput @onInputObject

        schema @onSchema {
          query: MyQuery
        }

        extend schema @onSchema
      `,
      );
    });

    it('with misplaced directives', () => {
      expectFailsRule(
        KnownDirectives,
        `
        type MyObj implements MyInterface @onInterface {
          myField(myArg: Int @onInputFieldDefinition): String @onInputFieldDefinition
        }

        scalar MyScalar @onEnum

        interface MyInterface @onObject {
          myField(myArg: Int @onInputFieldDefinition): String @onInputFieldDefinition
        }

        union MyUnion @onEnumValue = MyObj | Other

        enum MyEnum @onScalar {
          MY_VALUE @onUnion
        }

        input MyInput @onEnum {
          myField: Int @onArgumentDefinition
        }

        schema @onObject {
          query: MyQuery
        }

        extend schema @onObject
      `,
        [
          misplacedDirective('onInterface', 'OBJECT', 2, 43),
          misplacedDirective(
            'onInputFieldDefinition',
            'ARGUMENT_DEFINITION',
            3,
            30,
          ),
          misplacedDirective(
            'onInputFieldDefinition',
            'FIELD_DEFINITION',
            3,
            63,
          ),
          misplacedDirective('onEnum', 'SCALAR', 6, 25),
          misplacedDirective('onObject', 'INTERFACE', 8, 31),
          misplacedDirective(
            'onInputFieldDefinition',
            'ARGUMENT_DEFINITION',
            9,
            30,
          ),
          misplacedDirective(
            'onInputFieldDefinition',
            'FIELD_DEFINITION',
            9,
            63,
          ),
          misplacedDirective('onEnumValue', 'UNION', 12, 23),
          misplacedDirective('onScalar', 'ENUM', 14, 21),
          misplacedDirective('onUnion', 'ENUM_VALUE', 15, 20),
          misplacedDirective('onEnum', 'INPUT_OBJECT', 18, 23),
          misplacedDirective(
            'onArgumentDefinition',
            'INPUT_FIELD_DEFINITION',
            19,
            24,
          ),
          misplacedDirective('onObject', 'SCHEMA', 22, 16),
          misplacedDirective('onObject', 'SCHEMA', 26, 23),
        ],
      );
    });
  });
});
