import { F, T, ifElse, pipe } from "ramda";
import { getCacheKey } from "./cache";
import { sleep } from "./time";

export const withLock =
  (lock, unlock, f) =>
  async (...args) => {
    await lock();
    try {
      const result = await f(...args);
      await unlock();
      return result;
    } catch (e) {
      await unlock();
      throw e;
    }
  };

export const makeLockUnlockWithId = (set, unset) => [
  async (id) => {
    while (!(await set(id))) {
      await sleep(50);
    }
  },
  unset,
];

export const withLockByInput =
  (argsToLockId, lock, unlock, f) =>
  (...args) => {
    const lockId = argsToLockId(...args);
    return withLock(
      () => lock(lockId),
      () => unlock(lockId),
      f
    )(...args);
  };

export const sequentialized = (f) => {
  const queue = [];
  const lock = { isLocked: false };

  return (...args) =>
    // eslint-disable-next-line no-async-promise-executor
    new Promise(async (resolve, reject) => {
      queue.push([args, resolve, reject]);

      if (lock.isLocked) return;

      lock.isLocked = true;

      while (queue.length) {
        const [args, resolve, reject] = queue.shift();
        try {
          resolve(await f(...args));
        } catch (e) {
          reject(e);
        }
      }

      lock.isLocked = false;
    });
};

export const throttle = (maxParallelism, f) => {
  const lockObj = { count: 0 };
  return withLock(
    ...makeLockUnlockWithId(
      ifElse(
        () => lockObj.count < maxParallelism,
        pipe(() => lockObj.count++, T),
        F
      ),
      () => lockObj.count--
    ),
    f
  );
};

export const singleton = (factory) => {
  const instances = {};
  const throttledFactory = throttle(1, factory);

  return async (...args) => {
    const key = getCacheKey(args);
    if (instances[key]) {
      return instances[key];
    }

    instances[key] = await throttledFactory(...args);
    return instances[key];
  };
};
