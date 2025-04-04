{
  class ZenFolders extends ZenPreloadedFeature {
    init() {
      this.#initContextMenu();
      this.#initEventListeners();
    }

    #initEventListeners() {
      window.addEventListener('TabGrouped', this.#onTabGrouped.bind(this));
      window.addEventListener('TabUngrouped', this.#onTabUngrouped.bind(this));
      window.addEventListener('TabGroupRemoved', this.#onTabGroupRemoved.bind(this));
      window.addEventListener('TabGroupCreate', this.#onTabGroupCreate.bind(this));
      window.addEventListener('TabPinned', this.#onTabPinned.bind(this));
      window.addEventListener('TabUnpinned', this.#onTabUnpinned.bind(this));
      window.addEventListener('TabGroupExpand', this.#onTabGroupExpand.bind(this));
      window.addEventListener('TabGroupCollapse', this.#onTabGroupCollapse.bind(this));
      document.getElementById('zen-context-menu-new-folder').addEventListener('command', this.#onNewFolder.bind(this));
    }

    #initContextMenu() {
      const contextMenuItems = window.MozXULElement.parseXULToFragment(`
        <menuitem id="zen-context-menu-new-folder" data-l10n-id="zen-toolbar-context-new-folder"/>
      `);
      document.getElementById('toolbarNavigatorItemsMenuSeparator').before(contextMenuItems);
    }

    #onTabGrouped(event) {
      const tab = event.target;
      const group = tab.group;
      group.pinned = tab.pinned;

      if (group.hasAttribute('split-view-group') && group.hasAttribute('zen-pinned-changed')) {
        // zen-pinned-changed remove it and set it to had-zen-pinned-changed to keep
        // track of the original pinned state
        group.removeAttribute('zen-pinned-changed');
        group.setAttribute('had-zen-pinned-changed', true);
      }
    }

    #onTabUngrouped(event) {
      const tab = event.target;
      const group = event.detail;
      if (group.hasAttribute('split-view-group') && tab.hasAttribute('had-zen-pinned-changed')) {
        tab.setAttribute('zen-pinned-changed', true);
        tab.removeAttribute('had-zen-pinned-changed');
      }
    }

    #onTabGroupCreate(event) {
      const group = event.target;
      const tabs = group.tabs;
      if (!group.pinned) {
        return;
      }
      for (const tab of tabs) {
        if (tab.hasAttribute('zen-pinned-changed')) {
          tab.removeAttribute('zen-pinned-changed');
          tab.setAttribute('had-zen-pinned-changed', true);
        }
      }
    }

    #onTabGroupRemoved(event) {}

    #onTabPinned(event) {
      const tab = event.target;
      const group = tab.group;
      if (group && group.hasAttribute('split-view-group')) {
        group.pinned = true;
      }
    }

    #onTabUnpinned(event) {
      const tab = event.target;
      const group = tab.group;
      if (group && group.hasAttribute('split-view-group')) {
        group.pinned = false;
      }
    }

    expandGroupTabs(group) {
      for (const tab of group.tabs.reverse()) {
        gBrowser.ungroupTab(tab);
      }
    }

    handleTabPin(tab) {
      const group = tab.group;
      if (!group) {
        return false;
      }
      if (group.hasAttribute('split-view-group') && !this._piningFolder) {
        this._piningFolder = true;
        for (const otherTab of group.tabs) {
          if (tab === otherTab) {
            continue;
          }
          gBrowser.pinTab(otherTab);
        }
        this._piningFolder = false;
        gBrowser.verticalPinnedTabsContainer.insertBefore(group, gBrowser.verticalPinnedTabsContainer.lastChild);
        gBrowser.tabContainer._invalidateCachedTabs();
        return true;
      }
      return this._piningFolder;
    }

    handleTabUnpin(tab) {
      const group = tab.group;
      if (!group) {
        return false;
      }
      if (group.hasAttribute('split-view-group') && !this._piningFolder) {
        this._piningFolder = true;
        for (const otherTab of group.tabs) {
          if (tab === otherTab) {
            continue;
          }
          gBrowser.unpinTab(otherTab);
        }
        this._piningFolder = false;
        ZenWorkspaces.activeWorkspaceStrip.prepend(group);
        gBrowser.tabContainer._invalidateCachedTabs();
        return true;
      }
      return this._piningFolder;
    }

    #onNewFolder(event) {
      const group = gBrowser.addTabGroup([gBrowser.selectedTab], {
        insertBefore: ZenWorkspaces.pinnedTabsContainer.querySelector('.vertical-pinned-tabs-container-separator'),
        label: 'New Folder',
      });
      group.pinned = true;
    }

    #onTabGroupExpand(event) {}

    async #onTabGroupCollapse(event) {
      const group = event.target;
      const groupRect = group.getBoundingClientRect();
      const tabsContainer = group.querySelector('.tab-group-container');
      const animations = [];
      let selectedTabHeight = 0;
      for (const item of group.querySelector('.tab-group-container').children) {
        if (item.hasAttribute('visuallyselected')) {
          selectedTabHeight = item.getBoundingClientRect().height;
          continue;
        }
        const rect = item.getBoundingClientRect();
        // Calculate distance between the group label and the tab in order to animate
        // the tab translating into it vertically
        const translateY = groupRect.top - rect.top;
        animations.push(
          gZenUIManager.motion.animate(
            item,
            {
              y: [0, translateY],
            },
            {
              duration: 0.2,
              type: 'spring',
              bounce: 0,
            }
          )
        );
      }
      animations.push(
        gZenUIManager.motion.animate(
          tabsContainer,
          {
            height: [groupRect.height, selectedTabHeight],
          },
          {
            duration: 0.2,
            type: 'spring',
            bounce: 0,
          }
        )
      );
      await Promise.all(animations);
    }
  }

  window.gZenFolders = new ZenFolders();
}
