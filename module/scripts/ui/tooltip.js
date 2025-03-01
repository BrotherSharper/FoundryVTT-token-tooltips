import Settings, { HIDE_FROM_EVERYONE_OPTION, SHOW_TO_GMS_ONLY } from '../settings/index.js';
import { CSS_PREFIX } from '../module.js';
import { icon, emptyNode, img, div, span, appendText } from './html.js';
import { updateCustomAttributeRow } from './custom-attribute-display.js';
import * as attributeLookups from '../attribute-lookups/index.js';
import showNameOnly from '../attribute-lookups/showNameOnly.js';

import AttributeRow, { calculateValue } from './attribute-row.js';

const CSS_TOOLTIP = `${CSS_PREFIX}tooltip`;
const CSS_NAME = `${CSS_PREFIX}name`;
const CSS_DATA = `${CSS_PREFIX}data`;
const CSS_SHOW = `${CSS_PREFIX}show`;
const CSS_ROW = `${CSS_PREFIX}row`;
const CSS_LABEL = `${CSS_PREFIX}label`;
const CSS_VALUE = `${CSS_PREFIX}value`;
const CSS_CURRENT = `${CSS_PREFIX}current`;
const CSS_MAX = `${CSS_PREFIX}max`;
const CSS_TEMP = `${CSS_PREFIX}temp`;

class StandardRow {
  constructor(attributeLookup, minimumPermissionSetting, hideFromGMSetting) {
    this.attributeLookup = attributeLookup;
    this.minimumPermissionSetting = minimumPermissionSetting;
    this.hideFromGMSetting = hideFromGMSetting;
    this.row = null;
  }

  update(tooltip, actor) {
    if (showDataType(actor, this.minimumPermissionSetting, this.hideFromGMSetting)) {
      if(this.attributeLookup.rows) {
        for(let row of this.attributeLookup.rows(actor)) {
          const attributeRow = new AttributeRow(row.label, row.icon);
          tooltip._updateRow(attributeRow, row.value);
        }
      } else {
        if (this.row === null) {
          this.row = new AttributeRow(this.attributeLookup.label(), this.attributeLookup.icon());
        }
        tooltip._updateRow(this.row, this.attributeLookup.value(actor));
      }
    }
  }
}

class Tooltip {
  constructor() {
    this.element = div(CSS_TOOLTIP);

    this.nameElement = div(CSS_NAME);
    this.element.appendChild(this.nameElement);

    this.dataElement = div(CSS_DATA);
    this.element.appendChild(this.dataElement);

    this.standardRows = [];

    for (let hp of attributeLookups.hps) {
      this.standardRows.push(
        new StandardRow(hp, Settings.HPMinimumPermission, Settings.HidePlayerHPFromGM)
      );
    }

    for (let ac of attributeLookups.acs) {
      this.standardRows.push(
        new StandardRow(ac, Settings.ACMinimumPermission, Settings.HidePlayerACFromGM)
      );
    }

    for (let savingThrow of attributeLookups.savingThrows) {
      this.standardRows.push(
        new StandardRow(
          savingThrow,
          Settings.SavingThrowsMinimumPermission,
          Settings.HidePlayerSavingThrowsFromGM
        )
      );
    }

    for (let damageResImmVuln of attributeLookups.damageResImmVuln) {
      this.standardRows.push(
        new StandardRow(
          damageResImmVuln,
          Settings.DmgResVulnMinimumPermission,
          Settings.HidePlayerDmgResVulnFromGM
        )
      );
    }

    for (let conditionImmunity of attributeLookups.conditionImmunities) {
      this.standardRows.push(
        new StandardRow(
          conditionImmunity,
          Settings.CondImmMinimumPermission,
          Settings.HidePlayerCondImmFromGM
        )
      );
    }

    for (let passive of attributeLookups.passives) {
      this.standardRows.push(
        new StandardRow(
          passive,
          Settings.PassivesMinimumPermission,
          Settings.HidePlayerPassivesFromGM
        )
      );
    }

    for (let movement of attributeLookups.movements) {
      this.standardRows.push(
        new StandardRow(
          movement,
          Settings.MovementMinimumPermission,
          Settings.HidePlayerMovementFromGM
        )
      );
    }

    for (let resource of attributeLookups.resources) {
      this.standardRows.push(
        new StandardRow(
          resource,
          Settings.ResourcesMinimumPermission,
          Settings.HidePlayerResourcesFromGM
        )
      );
    }

    for (let spellSlot of attributeLookups.spellSlots) {
      this.standardRows.push(
        new StandardRow(
          spellSlot,
          Settings.SpellsMinimumPermission,
          Settings.HidePlayerSpellsFromGM
        )
      );
    }

    this.customRows = [];

    document.body.appendChild(this.element);
    window.addEventListener('mousedown', () => {
      this.element.classList.remove(CSS_SHOW);
    });

    Hooks.on('hoverToken', (token, hovered) => {
      this.onHover(token, hovered);
    });
  }

  onHover(token, hovered) {
    if (hovered && shouldShowTooltip(token)) {
      this.updateData(token);
      this.fixPosition(token);
      this.show();
    } else {
      this.hide();
    }
  }

  fixPosition(token) {
    document.documentElement.style.setProperty(
      '--illandril-token-tooltips--tooltip-rows',
      Settings.RowsPerTooltip.get()
    );
    if (Settings.ShowOnLeft.get()) {
      const right = window.innerWidth - Math.ceil(token.worldTransform.tx - 8);
      this.element.style.right = `${right}px`;
      this.element.style.left = '';
    } else {
      const tokenWidth = token.w * canvas.stage.scale.x;
      const left = Math.ceil(token.worldTransform.tx + tokenWidth + 8);
      this.element.style.left = `${left}px`;
      this.element.style.right = '';
    }
    const top = Math.floor(token.worldTransform.ty - 8);
    this.element.style.top = `${top}px`;
  }

  show() {
    this.element.classList.add(CSS_SHOW);
    this.dataElement.style.width = '';
    const lastRow = this.dataElement.lastChild;
    if(lastRow) {
      const newWidth = lastRow.offsetLeft + lastRow.offsetWidth;
      this.dataElement.style.width = `${newWidth}px`;
    }
  }

  hide() {
    this.element.classList.remove(CSS_SHOW);
  }

  updateData(token) {
    this.clearElements();

    this.updateName(token);

    const actor = token.actor;
    if(showNameOnly(actor)) {
      return;
    }
    for (let standardRow of this.standardRows) {
      standardRow.update(this, actor);
    }
    this.updateTalents(actor);
    this.updateItems(actor);

    this.updateCustomRows(actor);
  }

  clearElements() {
    emptyNode(this.nameElement);
    emptyNode(this.dataElement);
  }

  updateName(token) {
    if (Settings.ShowTokenName.get()) {
      this.nameElement.style.display = '';
      this.nameElement.appendChild(document.createTextNode(token.name));
    } else {
      this.nameElement.style.display = 'none';
    }
  }

  _updateRow(row, attribute) {
    const value = calculateValue(attribute);
    if (value) {
      row.setValue(value);
      this.dataElement.appendChild(row.element);
    }
  }

  updateItems(actor) {
    if (showDataType(actor, Settings.ItemsMinimumPermission, Settings.HidePlayerItemsFromGM)) {
      const items = attributeLookups.items.get(actor);
      for (let item of items) {
        const attributeRow = new AttributeRow(item.name, item.icon);
        this._updateRow(attributeRow, item.value);
      }
    }
  }

  updateTalents(actor) {
    if (showDataType(actor, Settings.TalentsMinimumPermission, Settings.HidePlayerTalentsFromGM)) {
      const talents = attributeLookups.talents.get(actor);
      for (let talent of talents) {
        const attributeRow = new AttributeRow(talent.name, talent.icon);
        this._updateRow(attributeRow, talent.value);
      }
    }
  }

  updateCustomRows(actor) {
    const customRows = Settings.CustomOptions.get();
    if (!customRows || customRows.length === 0) {
      return;
    }
    customRows.forEach((customRow, i) => {
      if (!showDataType(actor, customRow.permission, customRow.hideFromGM)) {
        return;
      }
      const row = updateCustomAttributeRow(actor, customRow, this.customRows, i);
      if (row) {
        this.dataElement.appendChild(row.element);
      }
    });
  }

  sortAndAdd(attributeArray) {
    attributeArray.sort(attributeSort);
    attributeArray.forEach((attr) => {
      this.dataElement.appendChild(attr.element);
    });
  }
}

const perm = (minimumPermissionSetting) => {
  if (!minimumPermissionSetting) {
    return 'NONE';
  }
  if (typeof minimumPermissionSetting === 'string') {
    return minimumPermissionSetting;
  }
  return minimumPermissionSetting.get() || 'NONE';
};

const boolOrBoolSetting = (boolSetting) => {
  if (typeof boolSetting === 'boolean') {
    return boolSetting;
  }
  return boolSetting && boolSetting.get();
};

const showDataType = (actor, minimumPermissionSetting, hideFromGMSetting) => {
  const minimumPermission = perm(minimumPermissionSetting);
  if (minimumPermission === HIDE_FROM_EVERYONE_OPTION) {
    return false;
  } else if (game.user.isGM) {
    return !(actor.hasPlayerOwner && boolOrBoolSetting(hideFromGMSetting));
  } else if (minimumPermission === SHOW_TO_GMS_ONLY) {
    return false;
  } else {
    return actor.testUserPermission(game.user, minimumPermission);
  }
};

const attributeSort = (a, b) => {
  return a.sort - b.sort;
};

const shouldShowTooltip = (token) => {
  if (!(token && token.actor)) {
    return false;
  }
  if (game.user.isGM) {
    return true;
  }
  return Settings.Visibility.shouldShowTooltip(token);
};

Hooks.once('ready', () => {
  new Tooltip();
});
