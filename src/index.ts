import { spawnSync } from 'child_process';
import fetch from 'node-fetch';

const date = '2021-08-06';
const time = '15:00';
const endTime = '20:00';

function toRetardedDate(goodDate: string): string {
    const [year, month, day] = goodDate.split('-');
    return `${month}-${day}-${year}`;
}

const url = new URL('https://www.sevenrooms.com/api-yoa/availability/widget/range');
url.searchParams.set('venue', 'ascendprime');
url.searchParams.set('time_slot', time);
url.searchParams.set('party_size', '2');
url.searchParams.set('start_date', toRetardedDate(date));
url.searchParams.set('num_days', '1');
url.searchParams.set('channel', 'SEVENROOMS_WIDGET');
url.searchParams.set('halo_size_interval', '16');

const minDate = new Date(`${date}T${time}`);
const maxDate = new Date(`${date}T${endTime}`);


interface TimeSlot {
    time_iso: string;
    access_persistent_id: null;
    sort_order: number;
    type: "request" | "book";
    time: string;
}

interface Availability {
    times: TimeSlot[];
}

interface ResponseRoot {
    data: {
        availability: {
            [key: string]: Availability[];
        }
    }
}

async function run() {
    const res = await fetch(url);
    const body = await res.json() as ResponseRoot;
    const availability = body.data.availability[date]?.[0];
    if (!availability) {
        console.log(body);
        console.warn('invalid request');
        return;
    }
    const slots: string[] = availability.times!.filter(t => {
        if (t.type !== 'book') {
            return false
        }
        const bookTime = new Date(t.time_iso.replace(' ', 'T'));
        return bookTime.getTime() >= minDate.getTime() && bookTime.getTime() <= maxDate.getTime();
    }).map(t => t.time);

    if (slots.length) {
        spawnSync('osascript', [
            '-e',
            `display notification "${slots.join(', ')}" with title "Reservation available!" sound name "Sosumi"`
        ]);
        console.log(new Date().toISOString(), slots.join(', '));
    } else {
        console.log(new Date().toISOString(), 'Nothing :(')
    }
}

setInterval(async () => {
    run();
}, 3 * 60 * 1000);
run();