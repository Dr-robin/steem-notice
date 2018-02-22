let steemURL = 'https://steemit.com';

Notification.requestPermission((status) => {
	if (Notification.permission !== status) {
		Notification.permission = status;
	}
	if(Notification.permission === 'denied') {
		$('#message').text('알림 설정이 꺼져 있어요ㅠㅠㅠ');
	}
});

if(localStorage.getItem('username')) {
	watch(localStorage.getItem('username'));
	$('#message').text(localStorage.getItem('username') + ' 계정의 스팀잇 알림이 시작되었어요!');
}
else {
	$('#message').text('계정명을 쓰고 저장 버튼을 눌러주세요!');
}

$('#form').submit(() => {
	let username = $('#username').val();
	if(username) {
		if(!localStorage.getItem('username')) {
			watch(username);
			$('#message').text('계정명을 저장했어요, 알림 시작할게요!');
		}
		else {
			$('#message').text('계정명을 저장했어요, 새로고침해주세요!');
		}
		localStorage.setItem('username', username);
	}
	return false;
});

function watch(username) {
	steem.api.streamOperations((err, res) => {
		if(!err) {
			if(res[0] === 'comment') {
				if(res[1].parent_author === username) {
					process('comment', res[1].author, res[1]);
				}
				else if(res[1].json_metadata) {
					let metadata = JSON.parse(res[1].json_metadata);
					if(metadata.users && metadata.users.includes(username)) {
						process('mention', res[1].author, res[1]);
					}
				}
			}
			else if(res[0] === 'vote' && res[1].author === username) {
				process('vote', res[1].voter, res[1]);
			}
			else if(res[0] === 'custom_json' && res[1].id === 'follow') {
				let json = JSON.parse(res[1].json);
				if(json[1].following === username) {
					process('follow', json[1].follower, res[1]);
				}
			}
		}
		else {
			console.error(err);
			window.location.reload();
		}
	});
}

function makeCommentURL(data) {
	if(data.json_metadata) {
		data.json_metadata = JSON.parse(data.json_metadata);
	}
	else {
		data.json_metadata = {};
	}
	let mainTag = data.json_metadata.tags ? data.json_metadata.tags[0] + '/@' : '@';
	return steemURL + '/' + mainTag + data.parent_author + '/' + data.parent_permlink + '#@'
		+ data.author + '/' + data.permlink;
}

function makeArticleURL(data) {
	return steemURL + '/@' + data.author + '/' + data.permlink;
}

function makeProfileURL(user) {
	return steemURL + '/@' + user;
}

function process(type, user, data) {
	switch(type) {
		case 'comment':
			noti(user + '님이 댓글을 달았어요.', {body: data.body}, makeCommentURL(data));
			break;
		case 'mention':
			noti(user + '님이 언급했어요.', {body: data.body},
				data.parent_author ? makeCommentURL(data) : makeArticleURL(data));
			break;
		case 'vote':
			noti(user + '님이 Upvote 했어요.', {}, makeArticleURL(data));
			break;
		case 'follow':
			noti(user + '님이 팔로우했어요.', {}, makeProfileURL(user));
	}
}

function noti(msg, options, link) {
	if(Notification && Notification.permission === "granted") {
		let n = new Notification(msg, options);
		n.onshow = () => {
			setTimeout(n.close, 5000);
		};
		n.onclick = () => {
			window.open(link, '_blank');
		};
	}
}