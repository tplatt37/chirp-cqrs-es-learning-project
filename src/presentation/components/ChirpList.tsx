import { ChirpReadModel } from '../../application/ports/IReadModelRepository';

interface ChirpListProps {
  chirps: ChirpReadModel[];
}

export function ChirpList({ chirps }: ChirpListProps) {
  if (chirps.length === 0) {
    return (
      <div style={styles.empty}>
        <p>No chirps yet. Follow some users to see their chirps!</p>
      </div>
    );
  }

  return (
    <div style={styles.list}>
      <h2 style={styles.heading}>Your Feed</h2>
      {chirps.map((chirp) => (
        <div key={chirp.chirpId} style={styles.chirp}>
          <div style={styles.header}>
            <span style={styles.username}>@{chirp.authorUsername}</span>
            <span style={styles.date}>
              {new Date(chirp.postedAt).toLocaleString()}
            </span>
          </div>
          <p style={styles.content}>{chirp.content}</p>
        </div>
      ))}
    </div>
  );
}

const styles = {
  list: {
    marginBottom: '20px',
  },
  heading: {
    marginTop: 0,
    marginBottom: '15px',
    fontSize: '20px',
  },
  empty: {
    padding: '40px',
    textAlign: 'center' as const,
    color: '#666',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  chirp: {
    padding: '15px',
    marginBottom: '10px',
    backgroundColor: 'white',
    border: '1px solid #e1e8ed',
    borderRadius: '8px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  username: {
    fontWeight: 'bold' as const,
    color: '#1da1f2',
  },
  date: {
    fontSize: '12px',
    color: '#657786',
  },
  content: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '1.5',
  },
};
