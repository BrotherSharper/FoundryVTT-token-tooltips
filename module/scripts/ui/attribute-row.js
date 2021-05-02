import { CSS_PREFIX } from '../module.js';
import { icon, emptyNode, img, div, span, appendText } from './html.js';

const CSS_ROW = `${CSS_PREFIX}row`;
const CSS_LABEL = `${CSS_PREFIX}label`;
const CSS_VALUE = `${CSS_PREFIX}value`;
const CSS_CURRENT = `${CSS_PREFIX}current`;
const CSS_MAX = `${CSS_PREFIX}max`;
const CSS_TEMP = `${CSS_PREFIX}temp`;
const CSS_UNITS = `${CSS_PREFIX}units`;

export default class AttributeRow {
  constructor(name, iconNameOrElem) {
    this.name = null;
    this.iconName = null;
    const row = div(CSS_ROW);

    const label = span(CSS_LABEL);
    this.label = label;
    this.setNameAndIcon(name, iconNameOrElem);
    row.appendChild(label);

    const valueDisplay = span(CSS_VALUE);
    row.appendChild(valueDisplay);

    const currDisplay = span(CSS_CURRENT);
    valueDisplay.appendChild(currDisplay);

    this.valueDisplay = valueDisplay;
    this.currDisplay = currDisplay;

    this.element = row;
  }

  setNameAndIcon(name, iconNameOrElem) {
    if (this.name === name && this.iconName === iconNameOrElem) {
      return;
    }
    this.name = name;
    let iconElem;
    if (typeof iconNameOrElem === 'string') {
      this.iconName = iconNameOrElem;
      iconElem = icon(iconNameOrElem);
    } else {
      this.iconName = null;
      iconElem = iconNameOrElem;
    }
    emptyNode(this.label);
    if (iconElem) {
      this.label.appendChild(iconElem);
      this.label.title = name;
    } else {
      appendText(this.label, name);
    }
  }

  setValue(value, max = null, temp = null, tempmax = null, units = null) {
    if(value instanceof Image) {
      emptyNode(this.currDisplay);
      this.currDisplay.appendChild(value);
      return;
    }
    if (typeof value === 'object') {
      this.setValue(value.value, value.max, value.temp, (value.tempmax || value.tempmax), value.units);
      return;
    }
    emptyNode(this.currDisplay);
    addValueWithTemp(this.currDisplay, value, temp);
    if (max) {
      if (this.maxDisplay) {
        emptyNode(this.maxDisplay);
      } else {
        this.maxDisplay = span(CSS_MAX);
        this.valueDisplay.appendChild(this.maxDisplay);
      }
      addValueWithTemp(this.maxDisplay, max, tempmax);
    } else {
      if (this.maxDisplay) {
        this.valueDisplay.removeChild(this.maxDisplay);
        this.maxDisplay = null;
      }
    }
    if (units) {
      if (this.unitsDisplay) {
        emptyNode(this.unitsDisplay);
      } else {
        this.unitsDisplay = span(CSS_UNITS);
        this.valueDisplay.appendChild(this.unitsDisplay);
      }
      appendText(this.unitsDisplay, '' + units);
    } else {
      if (this.unitsDisplay) {
        this.valueDisplay.removeChild(this.unitsDisplay);
        this.unitsDisplay = null;
      }
    }
  }
}

const nanToZero = (value) => {
  if (!value) {
    return 0;
  }
  const valueAsFloat = parseFloat(value);
  if (isNaN(valueAsFloat)) {
    return 0;
  }
  return valueAsFloat;
};

const addValueWithTemp = (element, value, opt_tempValue) => {
  if (!opt_tempValue) {
    addWithoutTemp(element, value);
  } else {
    const tempValue = nanToZero(opt_tempValue);
    if (tempValue === 0) {
      addWithoutTemp(element, value);
    } else {
      console.dir({ value, ntzValue: nanToZero(value), opt_tempValue, tempValue, sum: nanToZero(value) + tempValue });
      addWithoutTemp(element, nanToZero(value) + tempValue);
      element.classList.add(CSS_TEMP);
    }
  }
};

const addWithoutTemp = (element, value) => {
  element.classList.remove(CSS_TEMP);
  if (typeof value === 'number') {
    if (value === 0.125) {
      appendText(element, '⅛');
    } else if (value === 0.25) {
      appendText(element, '¼');
    } else if (value === 0.5) {
      appendText(element, '½');
    } else {
      appendText(element, '' + value);
    }
  } else if (!value) {
    appendText(element, '0');
  } else {
    appendText(element, value);
  }
};

const isValidAttributeValue = (value) => {
  if(isValidNonArrayAttributeValue(value)) {
    return true;
  }
  if(Array.isArray(value)) {
    return Array.prototype.every.call(value, isValidNonArrayAttributeValue);
  }
  return false;
};

const isValidNonArrayAttributeValue = (value) => {
  if (value === null || value === '') {
    return false;
  }
  if (typeof value === 'number' && !isNaN(value)) {
    return true;
  }
  return typeof value === 'string';
};

const isNumberLikeValue = (value) => {
  const valueAsFloat = parseFloat(value);
  return !isNaN(valueAsFloat);
};

export const calculateValue = (attribute, opt_attributeKey) => {
  const attributeKey = opt_attributeKey || '';
  if (attribute === null) {
    return null;
  }

  if (isValidAttributeValue(attribute)) {
    let value;
    if(Array.isArray(attribute)) {
      value = Array.prototype.join.call(attribute, ', ');
    } else if (typeof attribute === 'number' && attributeKey.endsWith('.pct')) {
      value = +attribute.toFixed(2) + '%';
    } else {
      value = attribute;
    }
    return {
      value,
    };
  }

  if (typeof attribute === 'object') {
    let value;
    if (isValidAttributeValue(attribute.total)) {
      value = attribute.total;
    } else if (isValidAttributeValue(attribute.value)) {
      value = attribute.value;
      if(Array.isArray(value)) {
        return calculateValue(value);
      }
    } else if (isValidAttributeValue(attribute.max)) {
      value = 0;
    } else {
      return null;
    }
    let max;
    if (isValidAttributeValue(attribute.max)) {
      max = attribute.max;
    } else {
      max = null;
    }
    let temp;
    if (isNumberLikeValue(value) && isNumberLikeValue(attribute.temp)) {
      temp = attribute.temp;
    } else {
      temp = null;
    }
    let tempmax;
    if (isNumberLikeValue(max) && isNumberLikeValue(attribute.tempmax)) {
      tempmax = attribute.tempmax;
    } else {
      tempmax = null;
    }
    let units;
    if (typeof attribute.units === 'string') {
      units = attribute.units;
    } else {
      units = null;
    }
    return { value, max, temp, tempmax, units };
  }
  return null;
};
