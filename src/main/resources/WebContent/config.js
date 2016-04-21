RSuite.controller.ManagerInbox = {
    manager: RSuite.controller.Inbox.manager
};

delete RSuite.controller.Inbox.manager;

RSuite.view.Activity.ManagerTasks = RSuite.view.Activity.Tasks.extend({
    controllerBinding: 'RSuite.controller.ManagerInbox'
});

RSuite.controller.activities.removeTab("Tasks");

RSuite.view.Activity.Tasks = RSuite.view.Activity.Tasks.extend({});

RSuite.controller.activities
	.addTab("Tasks", 0, RSuite.view.Activity.Tasks)
    .addTab("Manage", 0, RSuite.view.Activity.ManagerTasks);