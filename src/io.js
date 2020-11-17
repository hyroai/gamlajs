import {
  allPass,
  apply,
  complement,
  equals,
  head,
  isEmpty,
  last,
  length,
  map,
  prop,
  tap,
  unapply,
  zip,
  zipWith,
  when,
  pipe,
  unless,
  isNil,
  anyPass,
  juxt,
  applySpec,
} from "ramda";
import {
  asyncJuxt,
  asyncPairRight,
  asyncPipe,
  asyncExcepts,
} from "./functional";

const timeCondition = () => {
  let timePassed = false;
  let timeout;

  return () => {
    if (timeout) {
      return false;
    }
    timeout = setTimeout(() => (timePassed = true));
    return timePassed;
  };
};

export const executeConditionally = (executeQueue, condition) => (
  clear,
  resolveAll
) => when(condition, asyncPipe(tap(clear), executeQueue, resolveAll));

const stack = (functions) =>
  pipe(
    zip(functions),
    map(([f, x]) => f(x))
  );

/**
 * Batches calls to `executeQueues` at a specified interval.
 * @param argsToKey(arg1, arg2...) Invoked with f's arguments expected to return a textual key.
 * @param waitTime Interval in ms to wait for subsequent calls.
 * @param executeQueue - Invoked with a list of tasks. A task is a pair of [ resolve, [args] ].
 * @returns {function(...[*]): Promise}
 */
export const batch = (keyFn, waitTime, execute) => {
  const queues = {};

  return asyncPipe(
    asyncPairRight(keyFn),
    ([input, key]) =>
      new Promise((resolve, reject) => {
        queues[key] = queues[key] || [];
        queues[key].push({ resolve, reject, input });

        setTimeout(
          pipe(
            () => queues[key],
            unless(
              isNil,
              pipe(
                applySpec({
                  input: map(prop("input")),
                  reject: pipe(map(prop("reject")), juxt),
                  resolve: pipe(map(prop("resolve")), stack),
                }),
                ({ input, resolve, reject }) =>
                  asyncExcepts(
                    execute(() => delete queues[key], resolve),
                    reject
                  )(input)
              )
            )
          ),
          waitTime
        );
      })
  );
};

/* Transform `f` into a function that receives a list of tasks and executes them in a single call to `f`.
 *   Where a task is the pair [ resolve, [args] ].
 * @param merge([[call1Args], [call2Args],...])
 *    Invoked with an array of arguments.
 *    Each element in the array is a list of arguments that was passed in for a specific call to `f`.
 *    Expected to merge all function calls into a single argument list `f` will be invoked with.
 * @param split(args, results)
 *    Invoked with the original call list (similar to merge) and the results.
 *    Expected to return a list of length `args.length` where each element
 *    represents the results to return to a single caller.
 * @param f
 *    The function to transform.
 */
export const singleToMultiple = (merge, split, f) => (tasks) =>
  asyncPipe(merge, f, (results) => split(tasks, results))(tasks);
