/*
  Simplified BSD License (see LICENSES/BSD-2-Clause.txt or https://opensource.org/licenses/BSD-2-Clause)
  SPDX-FileCopyrightText: Ansible Project
  SPDX-License-Identifier: BSD-2-Clause
*/

import { parse, PartType } from './parser';

describe('parser tests', (): void => {
  it('empty string', (): void => {
    expect(parse('')).toEqual([]);
  });
  it('array with empty string', (): void => {
    expect(parse([''])).toEqual([[]]);
  });
  it('simple string', (): void => {
    expect(parse('test')).toEqual([[{ type: PartType.TEXT, text: 'test' }]]);
  });
  it('classic markup test', (): void => {
    expect(
      parse(
        'foo I(bar) baz C( bam ) B( ( boo ) ) U(https://example.com/?foo=bar)HORIZONTALLINE L(foo ,  https://bar.com) R( a , b )M(foo.bar.baz)HORIZONTALLINEx M(foo.bar.baz.bam)',
      ),
    ).toEqual([
      [
        { type: PartType.TEXT, text: 'foo ' },
        { type: PartType.ITALIC, text: 'bar' },
        { type: PartType.TEXT, text: ' baz ' },
        { type: PartType.CODE, text: ' bam ' },
        { type: PartType.TEXT, text: ' ' },
        { type: PartType.BOLD, text: ' ( boo ' },
        { type: PartType.TEXT, text: ' ) ' },
        { type: PartType.URL, url: 'https://example.com/?foo=bar' },
        { type: PartType.HORIZONTAL_LINE },
        { type: PartType.TEXT, text: ' ' },
        { type: PartType.LINK, text: 'foo', url: 'https://bar.com' },
        { type: PartType.TEXT, text: ' ' },
        { type: PartType.RST_REF, text: ' a', ref: 'b ' },
        { type: PartType.MODULE, fqcn: 'foo.bar.baz' },
        { type: PartType.TEXT, text: 'HORIZONTALLINEx ' },
        { type: PartType.MODULE, fqcn: 'foo.bar.baz.bam' },
      ],
    ]);
  });
  it('classic markup test II', (): void => {
    expect(
      parse(
        'foo I(bar) baz C( bam ) B( ( boo ) ) U(https://example.com/?foo=bar)HORIZONTALLINE L(foo ,  https://bar.com) R( a , b )M(foo.bar.baz)HORIZONTALLINEx M(foo.bar.baz.bam)',
        { only_classic_markup: true },
      ),
    ).toEqual([
      [
        { type: PartType.TEXT, text: 'foo ' },
        { type: PartType.ITALIC, text: 'bar' },
        { type: PartType.TEXT, text: ' baz ' },
        { type: PartType.CODE, text: ' bam ' },
        { type: PartType.TEXT, text: ' ' },
        { type: PartType.BOLD, text: ' ( boo ' },
        { type: PartType.TEXT, text: ' ) ' },
        { type: PartType.URL, url: 'https://example.com/?foo=bar' },
        { type: PartType.HORIZONTAL_LINE },
        { type: PartType.TEXT, text: ' ' },
        { type: PartType.LINK, text: 'foo', url: 'https://bar.com' },
        { type: PartType.TEXT, text: ' ' },
        { type: PartType.RST_REF, text: ' a', ref: 'b ' },
        { type: PartType.MODULE, fqcn: 'foo.bar.baz' },
        { type: PartType.TEXT, text: 'HORIZONTALLINEx ' },
        { type: PartType.MODULE, fqcn: 'foo.bar.baz.bam' },
      ],
    ]);
  });
  it('semantic markup test', (): void => {
    expect(parse('foo E(a\\),b) P(foo.bar.baz#bam) baz V( b\\,\\na\\)\\\\m\\, ) O(foo) ')).toEqual([
      [
        { type: PartType.TEXT, text: 'foo ' },
        { type: PartType.ENV_VARIABLE, name: 'a),b' },
        { type: PartType.TEXT, text: ' ' },
        { type: PartType.PLUGIN, plugin: { fqcn: 'foo.bar.baz', type: 'bam' } },
        { type: PartType.TEXT, text: ' baz ' },
        { type: PartType.OPTION_VALUE, value: ' b,na)\\m, ' },
        { type: PartType.TEXT, text: ' ' },
        { type: PartType.OPTION_NAME, plugin: undefined, link: ['foo'], name: 'foo', value: undefined },
        { type: PartType.TEXT, text: ' ' },
      ],
    ]);
  });
  it('semantic markup option name', (): void => {
    expect(parse('O(foo)')).toEqual([
      [
        {
          type: PartType.OPTION_NAME,
          plugin: undefined,
          link: ['foo'],
          name: 'foo',
          value: undefined,
        },
      ],
    ]);
    expect(parse('O(ignore:foo)', { current_plugin: { fqcn: 'foo.bar.baz', type: 'bam' } })).toEqual([
      [
        {
          type: PartType.OPTION_NAME,
          plugin: undefined,
          link: ['foo'],
          name: 'foo',
          value: undefined,
        },
      ],
    ]);
    expect(parse('O(foo)', { current_plugin: { fqcn: 'foo.bar.baz', type: 'bam' } })).toEqual([
      [
        {
          type: PartType.OPTION_NAME,
          plugin: { fqcn: 'foo.bar.baz', type: 'bam' },
          link: ['foo'],
          name: 'foo',
          value: undefined,
        },
      ],
    ]);
    expect(parse('O(foo.bar.baz#bam:foo)')).toEqual([
      [
        {
          type: PartType.OPTION_NAME,
          plugin: { fqcn: 'foo.bar.baz', type: 'bam' },
          link: ['foo'],
          name: 'foo',
          value: undefined,
        },
      ],
    ]);
    expect(parse('O(foo=bar)')).toEqual([
      [
        {
          type: PartType.OPTION_NAME,
          plugin: undefined,
          link: ['foo'],
          name: 'foo',
          value: 'bar',
        },
      ],
    ]);
    expect(parse('O(foo.baz=bam)')).toEqual([
      [
        {
          type: PartType.OPTION_NAME,
          plugin: undefined,
          link: ['foo', 'baz'],
          name: 'foo.baz',
          value: 'bam',
        },
      ],
    ]);
    expect(parse('O(foo[1].baz[bam.bar.boing].boo)')).toEqual([
      [
        {
          type: PartType.OPTION_NAME,
          plugin: undefined,
          link: ['foo', 'baz', 'boo'],
          name: 'foo[1].baz[bam.bar.boing].boo',
          value: undefined,
        },
      ],
    ]);
    expect(parse('O(bar.baz.bam.boo#lookup:foo[1].baz[bam.bar.boing].boo)')).toEqual([
      [
        {
          type: PartType.OPTION_NAME,
          plugin: { fqcn: 'bar.baz.bam.boo', type: 'lookup' },
          link: ['foo', 'baz', 'boo'],
          name: 'foo[1].baz[bam.bar.boing].boo',
          value: undefined,
        },
      ],
    ]);
  });
  it('semantic markup return value name', (): void => {
    expect(parse('RV(foo)')).toEqual([
      [
        {
          type: PartType.RETURN_VALUE,
          plugin: undefined,
          link: ['foo'],
          name: 'foo',
          value: undefined,
        },
      ],
    ]);
    expect(parse('RV(ignore:foo)', { current_plugin: { fqcn: 'foo.bar.baz', type: 'bam' } })).toEqual([
      [
        {
          type: PartType.RETURN_VALUE,
          plugin: undefined,
          link: ['foo'],
          name: 'foo',
          value: undefined,
        },
      ],
    ]);
    expect(parse('RV(foo)', { current_plugin: { fqcn: 'foo.bar.baz', type: 'bam' } })).toEqual([
      [
        {
          type: PartType.RETURN_VALUE,
          plugin: { fqcn: 'foo.bar.baz', type: 'bam' },
          link: ['foo'],
          name: 'foo',
          value: undefined,
        },
      ],
    ]);
    expect(parse('RV(foo.bar.baz#bam:foo)')).toEqual([
      [
        {
          type: PartType.RETURN_VALUE,
          plugin: { fqcn: 'foo.bar.baz', type: 'bam' },
          link: ['foo'],
          name: 'foo',
          value: undefined,
        },
      ],
    ]);
    expect(parse('RV(foo=bar)')).toEqual([
      [
        {
          type: PartType.RETURN_VALUE,
          plugin: undefined,
          link: ['foo'],
          name: 'foo',
          value: 'bar',
        },
      ],
    ]);
    expect(parse('RV(foo.baz=bam)')).toEqual([
      [
        {
          type: PartType.RETURN_VALUE,
          plugin: undefined,
          link: ['foo', 'baz'],
          name: 'foo.baz',
          value: 'bam',
        },
      ],
    ]);
    expect(parse('RV(foo[1].baz[bam.bar.boing].boo)')).toEqual([
      [
        {
          type: PartType.RETURN_VALUE,
          plugin: undefined,
          link: ['foo', 'baz', 'boo'],
          name: 'foo[1].baz[bam.bar.boing].boo',
          value: undefined,
        },
      ],
    ]);
    expect(parse('RV(bar.baz.bam.boo#lookup:foo[1].baz[bam.bar.boing].boo)')).toEqual([
      [
        {
          type: PartType.RETURN_VALUE,
          plugin: { fqcn: 'bar.baz.bam.boo', type: 'lookup' },
          link: ['foo', 'baz', 'boo'],
          name: 'foo[1].baz[bam.bar.boing].boo',
          value: undefined,
        },
      ],
    ]);
  });
  it('bad parameter parsing (no escaping, throw error)', (): void => {
    expect(async () => parse('M(', { errors: 'exception' })).rejects.toThrow(
      'While parsing M() at index 1: Cannot find closing ")" after last parameter',
    );
    expect(async () => parse('M(foo', { errors: 'exception' })).rejects.toThrow(
      'While parsing M() at index 1: Cannot find closing ")" after last parameter',
    );
    expect(async () => parse('L(foo)', { errors: 'exception' })).rejects.toThrow(
      'While parsing L() at index 1: Cannot find comma separating parameter 1 from the next one',
    );
    expect(async () => parse('L(foo,bar', { errors: 'exception' })).rejects.toThrow(
      'While parsing L() at index 1: Cannot find closing ")" after last parameter',
    );
    expect(async () => parse('L(foo), bar', { errors: 'exception' })).rejects.toThrow(
      'While parsing L() at index 1: Cannot find closing ")" after last parameter',
    );
    expect(async () => parse('P(', { errors: 'exception' })).rejects.toThrow(
      'While parsing P() at index 1: Cannot find closing ")" after last parameter',
    );
    expect(async () => parse('P(foo', { errors: 'exception' })).rejects.toThrow(
      'While parsing P() at index 1: Cannot find closing ")" after last parameter',
    );
  });
  it('bad module ref (throw error)', (): void => {
    expect(async () => parse('M(foo)', { errors: 'exception' })).rejects.toThrow(
      'While parsing M() at index 1: Error: Module name "foo" is not a FQCN',
    );
    expect(async () => parse(' M(foo.bar)', { errors: 'exception' })).rejects.toThrow(
      'While parsing M() at index 2: Error: Module name "foo.bar" is not a FQCN',
    );
    expect(async () => parse('  M(foo. bar.baz)', { errors: 'exception' })).rejects.toThrow(
      'While parsing M() at index 3: Error: Module name "foo. bar.baz" is not a FQCN',
    );
    expect(async () => parse('   M(foo)', { errors: 'exception' })).rejects.toThrow(
      'While parsing M() at index 4: Error: Module name "foo" is not a FQCN',
    );
  });
  it('bad plugin ref (throw error)', (): void => {
    expect(async () => parse('P(foo#bar)', { errors: 'exception' })).rejects.toThrow(
      'While parsing P() at index 1: Error: Parameter "foo#bar" is not of the form FQCN#type',
    );
    expect(async () => parse('P(f o.b r.b z#bar)', { errors: 'exception' })).rejects.toThrow(
      'While parsing P() at index 1: Error: Plugin name "f o.b r.b z" is not a FQCN',
    );
  });
  it('bad option name/return value (throw error)', (): void => {
    expect(async () => parse('O(f o.b r.b z#bam:foobar)', { errors: 'exception' })).rejects.toThrow(
      'While parsing O() at index 1: Error: Plugin name "f o.b r.b z" is not a FQCN',
    );
    expect(async () => parse('O(foo:bar:baz)', { errors: 'exception' })).rejects.toThrow(
      'While parsing O() at index 1: Error: Invalid option/return value name "foo:bar:baz"',
    );
  });
  it('bad parameter parsing (no escaping, error message)', (): void => {
    expect(parse('M(')).toEqual([
      [{ type: PartType.ERROR, message: 'While parsing M() at index 1: Cannot find closing ")" after last parameter' }],
    ]);
    expect(parse('M(foo', { errors: 'message' })).toEqual([
      [{ type: PartType.ERROR, message: 'While parsing M() at index 1: Cannot find closing ")" after last parameter' }],
    ]);
    expect(parse('L(foo)', { errors: 'message' })).toEqual([
      [
        {
          type: PartType.ERROR,
          message: 'While parsing L() at index 1: Cannot find comma separating parameter 1 from the next one',
        },
      ],
    ]);
    expect(parse('L(foo,bar', { errors: 'message' })).toEqual([
      [{ type: PartType.ERROR, message: 'While parsing L() at index 1: Cannot find closing ")" after last parameter' }],
    ]);
    expect(parse('L(foo), bar', { errors: 'message' })).toEqual([
      [{ type: PartType.ERROR, message: 'While parsing L() at index 1: Cannot find closing ")" after last parameter' }],
    ]);
    expect(parse('P(')).toEqual([
      [{ type: PartType.ERROR, message: 'While parsing P() at index 1: Cannot find closing ")" after last parameter' }],
    ]);
    expect(parse('P(foo', { errors: 'message' })).toEqual([
      [{ type: PartType.ERROR, message: 'While parsing P() at index 1: Cannot find closing ")" after last parameter' }],
    ]);
  });
  it('bad module ref (error message)', (): void => {
    expect(parse('M(foo)')).toEqual([
      [{ type: PartType.ERROR, message: 'While parsing M() at index 1: Error: Module name "foo" is not a FQCN' }],
    ]);
    expect(parse(' M(foo.bar)', { errors: 'message' })).toEqual([
      [
        { type: PartType.TEXT, text: ' ' },
        { type: PartType.ERROR, message: 'While parsing M() at index 2: Error: Module name "foo.bar" is not a FQCN' },
      ],
    ]);
    expect(parse('  M(foo. bar.baz)', { errors: 'message' })).toEqual([
      [
        { type: PartType.TEXT, text: '  ' },
        {
          type: PartType.ERROR,
          message: 'While parsing M() at index 3: Error: Module name "foo. bar.baz" is not a FQCN',
        },
      ],
    ]);
    expect(parse('   M(foo) baz', { errors: 'message' })).toEqual([
      [
        { type: PartType.TEXT, text: '   ' },
        { type: PartType.ERROR, message: 'While parsing M() at index 4: Error: Module name "foo" is not a FQCN' },
        { type: PartType.TEXT, text: ' baz' },
      ],
    ]);
  });
  it('bad plugin ref (error message)', (): void => {
    expect(parse('P(foo#bar)')).toEqual([
      [
        {
          type: PartType.ERROR,
          message: 'While parsing P() at index 1: Error: Parameter "foo#bar" is not of the form FQCN#type',
        },
      ],
    ]);
    expect(parse('P(f o.b r.b z#bar)', { errors: 'message' })).toEqual([
      [
        {
          type: PartType.ERROR,
          message: 'While parsing P() at index 1: Error: Plugin name "f o.b r.b z" is not a FQCN',
        },
      ],
    ]);
  });
  it('bad parameter parsing (no escaping, ignore error)', (): void => {
    expect(parse('M(', { errors: 'ignore' })).toEqual([[]]);
    expect(parse('M(foo', { errors: 'ignore' })).toEqual([[]]);
    expect(parse('L(foo)', { errors: 'ignore' })).toEqual([[]]);
    expect(parse('L(foo,bar', { errors: 'ignore' })).toEqual([[]]);
    expect(parse('L(foo), bar', { errors: 'ignore' })).toEqual([[]]);
    expect(parse('P(', { errors: 'ignore' })).toEqual([[]]);
    expect(parse('P(foo', { errors: 'ignore' })).toEqual([[]]);
  });
  it('bad module ref (ignore error)', (): void => {
    expect(parse('M(foo)', { errors: 'ignore' })).toEqual([[]]);
    expect(parse(' M(foo.bar)', { errors: 'ignore' })).toEqual([[{ type: PartType.TEXT, text: ' ' }]]);
    expect(parse('  M(foo. bar.baz)', { errors: 'ignore' })).toEqual([[{ type: PartType.TEXT, text: '  ' }]]);
    expect(parse('   M(foo) baz', { errors: 'ignore' })).toEqual([
      [
        { type: PartType.TEXT, text: '   ' },
        { type: PartType.TEXT, text: ' baz' },
      ],
    ]);
  });
  it('bad plugin ref (ignore error)', (): void => {
    expect(parse('P(foo#bar)', { errors: 'ignore' })).toEqual([[]]);
    expect(parse('P(f o.b r.b z#bar)', { errors: 'ignore' })).toEqual([[]]);
  });
});
