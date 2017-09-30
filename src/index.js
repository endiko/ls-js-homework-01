import './style.css';

const render = require('./list.hbs');
const html = render();

let ul = document.querySelector('#draggableContainer'),
    ulDrop = document.querySelector('#dropContainer'),
    inputLeft = document.querySelector('#input_left'),
    inputRight = document.querySelector('#input_right'),
    selectedItem,
    getFriend,
    getName,
    resParent,
    targetItem = null;

let friendsStorage = {};

let friendsStorageLeft = [],
    friendsStorageRight = [];

function api(method, params) {
    return new Promise((resolve, reject) => {
        VK.api(method, params, data => {
            if (data.error) {
                reject (new Error(data.error.error_msg));
            } else {
                resolve(data.response);
            }
        });
    });
}

function isMatching(full, chunk) {
    return (full.toLowerCase().indexOf(chunk.toLowerCase()) !== -1); 
}

function addItem(array, item) {
    return array.push(item);
}

function removeItem(array, item) {
    const index = array.indexOf(item);

    if (index !== -1) {
        array.splice(index, 1);
    }
}

function renderFriend(obj, targetList, icon) {
    let li = document.createElement('li');
    
    li.classList.add('friend__item');
    li.setAttribute('data-draggable', 'dragMe');
    li.setAttribute('draggable', 'true');
    li.innerHTML = '<div class="friend_photo__wrapper">'+
                        '<img src="'+obj.photo_100+'" class="image friend__photo" alt="">'+
                    '</div>'+
                    '<div class="friend__name">' + obj.first_name + ' ' + obj.last_name + '</div>'+
                    '<i class="item__icon ' + icon + '"></i>';

    targetList.appendChild(li);
}

function addDelFriend(objFrom, targetList) {
    let objTo;

    objTo = (objFrom === friendsStorageLeft) ? friendsStorageRight : friendsStorageLeft;

    objFrom.forEach(item => {
        if (isMatching(item.first_name+ ' ' + item.last_name, getFriend.innerText)) {
            addItem(objTo, item);
            removeItem(objFrom, item);
        }
    })

    filterFriends(objFrom, targetList);
    filterFriends(objTo, targetList);
}

function filterFriends(obj, targetList) {
    targetList.innerHTML = '';

    let arr = [];

    let input = (obj === friendsStorageLeft) ? inputLeft : inputRight;
        
    if (input.value === '') {
        arr = obj;
    } else {
        arr = obj.filter(item => {
            return isMatching(item.first_name +' ' + item.last_name, input.value);
        })
    }
    
    arr.forEach(item => {
        let icon = (targetList === ul) ? 'add__icon' : 'del__icon';

        renderFriend(item, targetList, icon);
    })
}

const promise = new Promise((resolve, reject) => {
    VK.init({
        apiId: 6192452
    });

    VK.Auth.login(data => {
        if (data.session) {
            resolve(data);
        } else {
            reject(new Error('Не удалось авторизоваться'));
        }
    }, 16);
});

promise
    .then(() => {
        return api('users.get', { v: 5.68, name_case: 'gen' });
    })
    .then(data => {
        const [user] = data;

        return api('friends.get', { v: 5.68, fields: 'first_name, last_name, photo_100', count: 15 });
    })
    .then(data => {
        const template = render({ list: data.items });
        let getLeftData = JSON.parse(localStorage.leftdata || '[]');
        let getRightData = JSON.parse(localStorage.rightdata || '[]');

        friendsStorage = data.items;

        if (localStorage.length > 1) {
            getLeftData.forEach(item => {
                friendsStorageLeft = getLeftData;
                renderFriend(item, ul, 'add__icon');
            })
            getRightData.forEach(item => {
                friendsStorageRight = getRightData;
                renderFriend(item, ulDrop, 'del__icon');
            })
        } else {
            friendsStorageLeft = friendsStorage;
            friendsStorageRight = [];
            ul.innerHTML = template;
        }
    })
    .then(data => {    
        ul.addEventListener('click', (e) => {
            selectedItem = e.target;
            
            if (selectedItem.tagName === 'I') {
                resParent = e.target.parentNode;
                getFriend = resParent.querySelector('.friend__name');
                addDelFriend(friendsStorageLeft, ulDrop);
                ul.removeChild(resParent);
            }
        });
    })
    .then(data => {
        ulDrop.addEventListener('click', (e) => {
            selectedItem = e.target;

            if (selectedItem.tagName === 'I') {
                resParent = e.target.parentNode;
                getFriend = resParent.querySelector('.friend__name');
                addDelFriend(friendsStorageRight, ul);
                ulDrop.removeChild(resParent);
            }
        });
    })
    .then(data => {
        document.addEventListener('dragstart', (e) => {
            targetItem = e.target;
            getName = (targetItem.tagName === 'IMG') ? targetItem.parentNode.parentNode : targetItem;
            e.dataTransfer.setData('text/html', '');

            return false;
        });
    })
    .then(data => {          
        document.addEventListener('dragover', (e) => {
            if (targetItem) {
                e.preventDefault();
            }

            return false;
        });
    })
    .then(data => {         
        document.addEventListener('drop', (e) => {
            targetItem = e.target;
            let dropTarget;
            
            getFriend = getName.querySelector('.friend__name');

            if (targetItem.querySelector('#dropContainer')) {
                dropTarget = targetItem.querySelector('#dropContainer');
                addDelFriend(friendsStorageLeft, ulDrop);
                ul.removeChild(getName);
        
            } else if (targetItem.querySelector('#draggableContainer')) {
                dropTarget = targetItem.querySelector('#draggableContainer');
                addDelFriend(friendsStorageRight, ul);
                ulDrop.removeChild(getName);
            } else {
                let newTarget;

                if (targetItem.parentNode.tagName === 'UL') {
                    newTarget = targetItem.parentNode;
                } else if (targetItem.parentNode.tagName === 'LI') {
                    newTarget = targetItem.parentNode.parentNode;
                } else if (targetItem.tagName === 'IMG') {
                    newTarget = targetItem.parentNode.parentNode.parentNode;
                }
                if (newTarget.getAttribute('id') === 'dropContainer') {
                    dropTarget = newTarget;
                    if (getName.parentNode !== dropTarget) {
                        addDelFriend(friendsStorageLeft, ulDrop);
                        ul.removeChild(getName);
                    }
                    addDelFriend(friendsStorageLeft, ulDrop);
                } else if (newTarget.getAttribute('id') === 'draggableContainer') {
                    dropTarget = newTarget;
                    if (getName.parentNode !== dropTarget) {
                        ulDrop.removeChild(getName);
                        addDelFriend(friendsStorageRight, ul);
                    }
                    addDelFriend(friendsStorageRight, ul);
                }
            }
            
            return false;
        });
    })
    .then(data => {             
        document.addEventListener('dragend', (e) => {
            targetItem = null;

            return false;
        });
    })
    .then(data => {
        inputLeft.addEventListener('keyup', () => {
            filterFriends(friendsStorageLeft, ul);
        })
    })
    .then(data => {
        inputRight.addEventListener('keyup', () => {
            filterFriends(friendsStorageRight, ulDrop);
        })
    })
    .then(data => {
        let saveButton = document.querySelector('#saveButton');
        
        saveButton.addEventListener('click', () => {
            if (confirm ('Подтвердите сохранение')) {
                localStorage.leftdata = JSON.stringify(friendsStorageLeft);
                localStorage.rightdata = JSON.stringify(friendsStorageRight);
            } else {
                return;
            }
        })
    })
    .catch((e) => {
        alert('Ошибка: ' + e.message);
    })

