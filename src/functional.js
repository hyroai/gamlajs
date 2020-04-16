import {
  apply,
  chain,
  groupBy,
  map,
  nth,
  pipe,
  tap,
  uniq,
  xprod,
  filter,
  reduce,
  identity,
  curry,
  juxt,
  last,
  head,
  toPairs,
  fromPairs,
  adjust
} from "ramda";

export const edgesToGraph = pipe(groupBy(nth(0)), map(pipe(map(nth(1)), uniq)));

export const groupByMany = f =>
  pipe(
    chain(pipe(element => [f(element), [element]], apply(xprod))),
    edgesToGraph
  );

export const log = tap(console.log);

const resolveAll = promises => Promise.all(promises);

export const asyncIdentity = async input => await Promise.resolve(input);

export const asyncPipe = (...funcs) => input =>
  reduce(async (acc, f) => f(await acc), Promise.resolve(input), funcs);

export const asyncFirst = (...funcs) => async (...args) => {
  const results = await asyncPipe(
    map(f => f(...args)),
    resolveAll,
    filter(identity)
  )(funcs);

  if (results.length) {
    return results[0];
  }
};

export const asyncMap = curry((f, seq) => asyncPipe(map(f), resolveAll)(seq));

export const asyncJuxt = funcs => (...args) =>
  asyncPipe(juxt(funcs), resolveAll)(args);

export const asyncFilter = pred => seq =>
  asyncPipe(
    asyncMap(async arg => [arg, await pred(arg)]),
    filter(last),
    map(head)
  )(seq);

export const keyMap = fn => pipe(toPairs, map(adjust(0, fn)), fromPairs);

export const sortAlphabetically = (array) => array.sort((str1, str2) => str1.localeCompare(str2));
