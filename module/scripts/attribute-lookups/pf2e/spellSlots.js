import pf2eSystemID from './systemID.js';

const getSpellcastingEntries = (actor) => {
  const entries = [];
  for (let item of actor.data.items) {
    if (item.type === 'spellcastingEntry') {
      entries.push({
        sort: item.data.sort || 0,
        spellcastingEntry: actor.spellcasting.get(item.id),
      });
    }
  }
  entries.sort((a, b) => a.sort - b.sort);
  return entries.map((e) => e.spellcastingEntry);
};

const getFocusEntry = (actor, spellIcon) => {
  const label = game.i18n.localize('illandril-token-tooltips.focusAbbreviation');
  return {
    label,
    icon: spellIcon(label),
    value: getProperty(actor, 'data.data.resources.focus'),
  };
};

const getLevelEntry = (level, spellIcon) => {
  if (level.uses && level.uses.value !== undefined && level.uses.max > 0) {
    let levelSlot;
    let label;
    if (level.isCantrip) {
      label = game.i18n.localize('illandril-token-tooltips.cantripAbbreviation');
    } else {
      label = level.level;
    }
    return {
      icon: spellIcon(label),
      label,
      value: level.uses,
    };
  }
};

export default (spellIcon) => ({
  rows: (actor) => {
    const slots = [];
    if (game.system.id === pf2eSystemID) {
      if (actor.spellcasting) {
        let spellcastingEntries = getSpellcastingEntries(actor);
        let hasFocus = false;
        for (let entry of spellcastingEntries) {
          if (entry.isFocusPool) {
            if (!hasFocus) {
              hasFocus = true;
              slots.push(getFocusEntry(actor, spellIcon));
            }
            continue;
          }
          if (entry.getSpellData) {
            const spellData = entry.getSpellData();
            for (let level of spellData.levels) {
              const levelEntry = getLevelEntry(level, spellIcon);
              levelEntry && slots.push(levelEntry);
            }
          }
        }
        //spellcastingEntries
      }
    }
    return slots;
  },
});
