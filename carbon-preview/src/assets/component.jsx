import React from 'react';
import { Button } from '@carbon/react';
import { Add16, ChevronLeft16, ChevronRight16 } from '@carbon/icons-react';

const CompV5 = () => {
    const days = Array.from({ length: 42 }, (_, i) => ({
        value: i + 1,
        selected: (i + 1) === 13
    }));

    const styles = {
        root: {
            fontFamily: 'IBM Plex Sans, Arial, sans-serif',
            width: '312px',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
        },
        frame: { padding: 0, margin: 0 },
        progressContainer: { padding: 12, display: 'flex', flexDirection: 'column' },
        progressLabel: { fontSize: 14, color: '#161616', marginBottom: 6 },
        progressTrack: { width: 220, height: 8, background: '#c6c6c6', borderRadius: 4, position: 'relative' },
        progressFill: { position: 'absolute', left: 0, top: 0, height: '100%', width: '0%', background: '#0f62fe', borderRadius: 4 },
        progressHelper: { marginTop: 6, fontSize: 12, color: '#6f6f6f' },
        calendarFrame: { width: 288, height: 340, background: '#f4f4f4', padding: 12, borderRadius: 4 },
        calendarHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0 8px' },
        monthYear: { display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'IBM Plex Sans' },
        dayGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 40px)', gap: '8px', paddingTop: 8 },
        dayCell: { width: 40, height: 40, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' },
        dayText: { fontSize: 14, color: '#161616' },
        selectedDot: { position: 'absolute', top: 6, left: 6, width: 4, height: 4, borderRadius: '50%', background: '#0f62fe' },
        selectedDay: { color: '#0f62fe', fontWeight: 600, fontSize: 14 },
        buttonFrame: { padding: 12, paddingTop: 0 }
    };

    return (
        <div style={styles.root}>
            <section aria-label="Progress bar frame" style={styles.frame}>
                <div style={styles.progressContainer}>
                    <div style={styles.progressLabel}>Progress bar label</div>
                    <div role="progressbar" aria-valuenow={0} aria-valuemin={0} aria-valuemax={100} style={styles.progressTrack}>
                        <div style={styles.progressFill} />
                    </div>
                    <div style={styles.progressHelper}>Optional helper text</div>
                </div>
            </section>

            <section aria-label="Calendar Frame" style={styles.calendarFrame}>
                <div style={styles.calendarHeader}>
                    <button aria-label="Previous month" style={{ border: 'none', background: 'transparent', padding: 8 }}>
                        <ChevronLeft16 />
                    </button>
                    <div style={styles.monthYear}>
                        <span style={{ fontWeight: 600 }}>March</span>
                        <span style={{ color: '#161616' }}>2021</span>
                    </div>
                    <button aria-label="Next month" style={{ border: 'none', background: 'transparent', padding: 8 }}>
                        <ChevronRight16 />
                    </button>
                </div>
                <div style={styles.dayGrid} role="grid" aria-label="Date grid">
                    {days.map((d) => (
                        <div key={d.value} role="gridcell" aria-label={`Day ${d.value}`} style={styles.dayCell}>
                            {d.selected && <span style={styles.selectedDot} aria-hidden="true" />}
                            <span style={d.selected ? styles.selectedDay : styles.dayText}>{d.value}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section aria-label="Button Frame" style={styles.buttonFrame}>
                <Button kind="primary" size="md" renderIcon={Add16} aria-label="Button with add icon">Button</Button>
            </section>
        </div>
    );
};

export default CompV5;
