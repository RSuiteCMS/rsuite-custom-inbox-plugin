// Inbox reloading patch for 4.0.0 to 4.1.14 - Fixes problems with cache persistence and multi-tapping
//	of inbox service on document focus click away from tasks activity.
(function () {
	// RSuite.view.Activity clears out the Tasks cache on destroy.  This is
	// Circumventing the clear-out of the tasks cache; we need to call a
	//	super-function (to handle normal view destroy stuff)
	// `Tasks`' super is Ember.CollectionView, so we'll use that.
	// This is not captured in-context, since we extend `Tasks` later,
	//	and this.constructor.superclass would just point to the base implementation,
	//	not the real superclass.
	var superProto = RSuite.view.Activity.Tasks.superclass.proto();

	if (!RSuite.view.Activity.Tasks.proto().clearControlledInboxes) {
		RSuite.view.Activity.Tasks.reopen({
			clearControlledInboxes: function () {
				Object.keys(this.get('controller')).forEach(function (name) {
					var cachedInbox = RSuite.model.Inbox.cache[name];
					delete RSuite.model.Inbox.cache[name];
					Ember.run.schedule('destroy', this, function () {
						cachedInbox.destroy();
						//Make sure it stays gone.
						delete RSuite.model.Inbox.cache[name];
					});
				}, this);
			},
			remove: function () {
				this.clearControlledInboxes();
				this._super();
			},
			willDestroy: function () {
				superProto.willDestroy.apply(this);
			}
		});
	}
	// Original flow (quick succession):
	//	[document focus event] -> inbox model is asked to refresh (user, roles)
	//	[tab click event] -> activity switched to another inbox; child views destroyed
	//	[activity view remove event] -> inbox cache is cleared
	//	[inbox controller scheduler] -> request for inbox data made (user, roles)
	//  [activity view insert] -> inbox model requested from controller (manager)
	//  [inbox controller scheduler] -> request for inbox data made (manager)
	//  [inbox controller scheduler] -> inbox model recieved; user and roles models created and populated. (oops!)
	//  [inbox controller scheduler] -> inbox model recieved; manager model created and populated.

	// Refresh happens to Inboxes on document focus; we still want this to happen,
	//  but in order to allow an on-focus-click-to-other-tab, we delay the call
	//	until the end of all run queues.  This enables the cache-clear on removal
	//	of the parent view (RSuite.View.Activity.Tasks/ManageTasks) to execute
	//	before we attempt to reload the inboxes.

	// New flow:
	//  [document focus event] -> real refresh is scheduled for final queue in run loop
	//	[tab click event] -> activity switched to another inbox; child views destroyed
	//	[activity view remove event] -> inbox cache is cleared
	//	[inbox realRefresh] -> inbox model is not asked to refresh, as it's been destroyed
	//  [activity view insert] -> inbox model requested from controller (manager)
	//  [inbox controller scheduler] -> request for inbox data made (manager)
	//  [inbox controller scheduler] -> inbox model recieved; manager model created and populated.
	if (!RSuite.view.Inbox.proto().realRefresh) {
		var refresh = RSuite.view.Inbox.proto().refresh;
		RSuite.view.Inbox.reopen({
			realRefresh: function () {
				if (!this.isDestroying && !this.isDestroyed) {
					refresh.apply(this);
				}
			},
			refresh: function () {
				Ember.run.schedule('timers', this, 'realRefresh');
			}
		});
	}
}());

// Creates the controller for the `Manage` tab, containing the `Manage tasks`
//	panel
RSuite.controller.ManagerInbox = {
    manager: RSuite.controller.Inbox.manager
};

//Removes the `Manage tasks` panel from the `Tasks` tab
delete RSuite.controller.Inbox.manager;

//Creates the `Manager` tab
RSuite.view.Activity.ManagerTasks = RSuite.view.Activity.Tasks.extend({
    controllerBinding: 'RSuite.controller.ManagerInbox'
});


//Extend the original `Tasks` tab so RSuite.controller.activities doesn't
// misassign `Manage` to `Tasks` in active tab detection
RSuite.view.Activity.Tasks = RSuite.view.Activity.Tasks.extend({});

//Remove the old `Tasks` tab
RSuite.controller.activities.removeTab("Tasks");

//Add the new `Tasks` tab and the `Manage` tab.
RSuite.controller.activities
	.addTab("Tasks", 0, RSuite.view.Activity.Tasks)
    .addTab("Manage", 0, RSuite.view.Activity.ManagerTasks);
