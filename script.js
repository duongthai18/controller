let joystickState = { leftX: 0, leftY: 0, rightX: 0, rightY: 0, specialAction: 0 }; // Initialize to 0
    let lastSentTime = 0;
    const specialActionSwitch = document.getElementById('special-action-switch');

    function scaleValue(val) {
        return Math.round((val + 1) * 127.5);
    }

    function sendJoystickData() {
        const now = Date.now();
        if (now - lastSentTime < 100) return; // Throttle to 100ms
        lastSentTime = now;

        const data = {
            roll: scaleValue(joystickState.leftX),
            pitch: scaleValue(joystickState.leftY),
            yaw: scaleValue(joystickState.rightX),
            throttle: scaleValue(joystickState.rightY),
            AUX1: joystickState.specialAction // Include switch state
        };

        console.log("Sending data:", data);

        fetch('http://192.168.5.147/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
            .then(response => response.text())
            .then(result => console.log("Server response:", result))
            .catch(error => console.error("Error:", error));
    }

    function setupJoystick(joystickId, knobId, joystickKeyX, joystickKeyY) {
        const joystick = document.getElementById(joystickId);
        const knob = document.getElementById(knobId);
        let active = false; // Track active state *per joystick*
        let eventType = ''; // Track event type (mouse or touch) *per joystick*

        function startMove(event) {
            event.preventDefault();
            active = true;
            eventType = event.type.startsWith('touch') ? 'touch' : 'mouse';
            moveKnob(event);
        }

        function doMove(event) {
            if (active) {
                moveKnob(event);
            }
        }

        function stopMove() {
            active = false;
            knob.style.top = '50%';
            knob.style.left = '50%';
            joystickState[joystickKeyX] = 0;
            joystickState[joystickKeyY] = 0;
            sendJoystickData(); // Send data immediately on release
        }

        function getEventCoordinates(event) {
            if (eventType === 'touch' && event.touches.length > 0) {
                // Find the touch associated with this joystick
                for (let i = 0; i < event.touches.length; i++) {
                    const touch = event.touches[i];
                    const target = touch.target; // The element that was touched
                    if (target === joystick || target === knob) {
                        return { clientX: touch.clientX, clientY: touch.clientY };
                    }
                }
                // If no matching touch is found, return null
                return null;
            } else {
                return { clientX: event.clientX, clientY: event.clientY };
            }
        }

        function moveKnob(event) {
            const coords = getEventCoordinates(event);
            if (!coords) return; // Exit if no valid touch

            const rect = joystick.getBoundingClientRect();
            let x = coords.clientX - rect.left - rect.width / 2;
            let y = coords.clientY - rect.top - rect.height / 2;
            let maxDist = rect.width / 2 - 25;
            let dist = Math.sqrt(x * x + y * y);

            if (dist > maxDist) {
                x = (x / dist) * maxDist;
                y = (y / dist) * maxDist;
            }

            knob.style.left = `${50 + (x / maxDist) * 50}%`;
            knob.style.top = `${50 + (y / maxDist) * 50}%`;

            joystickState[joystickKeyX] = x / maxDist;
            joystickState[joystickKeyY] = y / maxDist;

            sendJoystickData(); // Send data immediately on move
        }

        joystick.addEventListener('mousedown', startMove);
        joystick.addEventListener('touchstart', startMove, { passive: false });

        document.addEventListener('mousemove', doMove);  // Listen on document
        document.addEventListener('touchmove', doMove, { passive: false }); // Listen on document

        document.addEventListener('mouseup', stopMove);   // Listen on document
        document.addEventListener('touchend', stopMove);  // Listen on document
        document.addEventListener('mouseleave', stopMove); // Listen on document
    }

    setupJoystick('left-joystick', 'left-knob', 'leftX', 'leftY');
    setupJoystick('right-joystick', 'right-knob', 'rightX', 'rightY');
    // setInterval(sendJoystickData, 100); //No longer needed


    specialActionSwitch.addEventListener('change', () => {
        joystickState.specialAction = specialActionSwitch.checked ? 1 : 0; // Set to 255 when checked, 0 when unchecked.  Any non-zero value will be considered "on."
        sendJoystickData();
    });