import LwcBase from 'c/lwcBase';
import { api } from 'lwc';

export default class TimeDifference extends LwcBase {
	@api
	get dateTimeValue() {
		return this._dateTimeValue;
	}

	set dateTimeValue(value) {
		this._dateTimeValue = value;
		this.updateTimeAgo();
	}

	_dateTimeValue;
	timeAgo = '';

	connectedCallback() {
		this.updateTimeAgo();
		setInterval(() => this.updateTimeAgo(), 60000); // Update every minute
	}

	updateTimeAgo() {
		if (!this._dateTimeValue) {
			this.timeAgo = "?";
		} else {
			const now = new Date();
			const then = new Date(this._dateTimeValue);
			const diffInSeconds = Math.round((now - then) / 1000);
		
			if (diffInSeconds < 60) {
				this.timeAgo =
					diffInSeconds < 5 ?
						'a few seconds ago' :
						`${diffInSeconds} seconds ago`;
			} else if (diffInSeconds < 3600) {
				const diffInMinutes = Math.round(diffInSeconds / 60);
				this.timeAgo =
					diffInMinutes === 1 ?
						'a minute ago' :
						`${diffInMinutes} minutes ago`;
			} else if (diffInSeconds < 86400) {
				const diffInHours = Math.round(diffInSeconds / 3600);
				this.timeAgo =
					diffInHours === 1 ?
						'an hour ago' :
						`${diffInHours} hours ago`;
			} else if (diffInSeconds < 604800) {
				const diffInDays = Math.round(diffInSeconds / 86400);
				this.timeAgo =
					diffInDays === 1 ?
						'yesterday' :
						`${diffInDays} days ago`;
			} else {
				const diffInWeeks = Math.round(diffInSeconds/604800);
				this.timeAgo =
					diffInWeeks === 1 ?
					'a week ago' :
					`${diffInWeeks} weeks ago`;
			}
		}

		this.customEvent("timeagoupdate", {
			timeAgo: this.timeAgo
		});
	}
}