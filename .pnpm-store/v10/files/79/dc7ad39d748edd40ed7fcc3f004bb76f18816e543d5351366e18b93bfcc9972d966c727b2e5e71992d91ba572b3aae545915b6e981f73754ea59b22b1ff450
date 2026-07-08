"use strict";

/**
 * Access the ref using the method that doesn't yield a warning.
 *
 * Before React 19 accessing `element.props.ref` will throw a warning and suggest using `element.ref`
 * After React 19 accessing `element.ref` does the opposite.
 * https://github.com/facebook/react/pull/28348
 */
export function getElementRef(element) {
  // React <=18 in DEV
  let getter = Object.getOwnPropertyDescriptor(element.props, 'ref')?.get?.bind(element.props);
  let mayWarn = getter && 'isReactWarning' in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }

  // React 19 in DEV
  getter = Object.getOwnPropertyDescriptor(element, 'ref')?.get?.bind(element);
  mayWarn = getter && 'isReactWarning' in getter && getter.isReactWarning;
  if (mayWarn) {
    // @ts-ignore
    return element.props.ref; // eslint-disable-line
  }

  // Not DEV
  // @ts-ignore
  return element.props.ref || element.ref; // eslint-disable-line
}
export function composeRefs(...refs) {
  return value => {
    refs.forEach(ref => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref !== null && ref !== undefined) {
        ref.current = value;
      }
    });
  };
}
//# sourceMappingURL=ref.js.map