import matchPaths from './match-paths';
import Paths from '../constants/Paths';

describe('matchPaths', () => {
  test('matches the project presentation route before returning NotFound', () => {
    const match = matchPaths('/projects/project-1/presentation', Object.values(Paths));

    expect(match?.pattern.path).toBe(Paths.PRESENTATION);
    expect(match?.params).toEqual({ id: 'project-1' });
  });
});
